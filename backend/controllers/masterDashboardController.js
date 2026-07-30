const PurchaseOrder = require("../models/PurchaseOrder");
const Client = require("../models/Client");
const Lead = require("../models/Lead");
const User = require("../models/User");
const Quotation = require("../models/Quotation");
const mongoose = require("mongoose");

// Helper to format currency in Cr (Crores) or INR
const formatCr = (num) => {
    if (!num || isNaN(num)) return 0;
    return Number((num / 10000000).toFixed(2));
};

/**
 * @desc    Get Comprehensive Master Dashboard Data for Purchase Orders
 * @route   GET /api/dashboard/master
 * @access  Private
 */
const getMasterDashboardData = async (req, res) => {
    try {
        const { startDate, endDate, brand, client, salesPerson, state, status } = req.query;

        // 1. Fetch all clients to build client-state & sales-person mappings
        const clients = await Client.find({}).select("clientName legalEntityName billingAddress.state contactPerson1").lean();
        const clientStateMap = new Map();
        clients.forEach(c => {
            const st = c.billingAddress?.state || "Delhi";
            if (c.clientName) clientStateMap.set(c.clientName.trim().toLowerCase(), st);
            if (c.legalEntityName) clientStateMap.set(c.legalEntityName.trim().toLowerCase(), st);
        });

        // 2. Fetch users for Sales Person list & mapping
        const users = await User.find({}).select("_id name email role").lean();
        const userNameMap = new Map();
        users.forEach(u => userNameMap.set(String(u._id), u.name));

        // 3. Fetch POs with population
        let filter = {};
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.date.$lte = end;
            }
        }
        if (status && status !== "All" && status !== "all") {
            filter.status = status;
        }

        const rawPOs = await PurchaseOrder.find(filter)
            .populate({
                path: "pi",
                populate: { path: "lead", select: "leadNumber assignedTo name source" }
            })
            .populate("createdBy", "name")
            .sort({ date: -1, createdAt: -1 })
            .lean();

        // 4. Transform and enrich PO records
        const enrichedPOs = rawPOs.map(po => {
            const clientName = po.vendorName || po.pi?.billTo?.name || po.pi?.lead?.name || "Unassigned Client";
            const stateName = clientStateMap.get(clientName.trim().toLowerCase()) || "N/A";

            // Determine Sales Person
            let salesPersonName = "Unassigned";
            if (po.pi?.lead?.assignedTo) {
                const spId = String(po.pi.lead.assignedTo._id || po.pi.lead.assignedTo);
                if (userNameMap.has(spId)) salesPersonName = userNameMap.get(spId);
            } else if (po.pi?.lead?.source) {
                salesPersonName = po.pi.lead.source;
            } else if (po.createdBy?.name) {
                salesPersonName = po.createdBy.name;
            }

            // Extract Primary Brand
            let primaryBrand = "Unspecified Brand";
            if (po.products && po.products.length > 0) {
                const brandsInPo = po.products.map(p => p.brand).filter(Boolean);
                if (brandsInPo.length > 0) primaryBrand = brandsInPo[0];
            }

            // Invoiced Value calculation
            let invoicedVal = 0;
            if (po.invoiceHistory && po.invoiceHistory.length > 0) {
                invoicedVal = po.invoiceHistory.reduce((sum, inv) => sum + (inv.totalValue || 0), 0);
            } else if (po.products && po.products.length > 0) {
                invoicedVal = po.products.reduce((sum, p) => {
                    const invQty = p.invoicedQuantity || 0;
                    return sum + (invQty * (p.unitPrice || 0));
                }, 0);
            }

            const poVal = po.totalValue || 0;
            const pendingVal = Math.max(0, poVal - invoicedVal);

            // Normalized Status
            let displayStatus = po.status || "Confirmed";
            if (displayStatus === "Pending") displayStatus = "Pending";
            else if (displayStatus === "Invoiced" || (poVal > 0 && invoicedVal >= poVal)) displayStatus = "Confirmed";

            return {
                _id: po._id,
                poNumber: po.poNumber,
                poDate: po.date ? new Date(po.date).toISOString().split("T")[0] : new Date(po.createdAt).toISOString().split("T")[0],
                rawDate: po.date || po.createdAt,
                client: clientName,
                brand: primaryBrand,
                salesPerson: salesPersonName,
                state: stateName,
                poValue: poVal,
                invoicedValue: invoicedVal,
                pendingValue: pendingVal,
                status: displayStatus,
                products: po.products || []
            };
        });

        // 5. Apply memory filters (Brand, Client, SalesPerson, State)
        let filteredPOs = enrichedPOs.filter(po => {
            if (brand && brand !== "All" && brand !== "all" && po.brand !== brand) return false;
            if (client && client !== "All" && client !== "all" && po.client !== client) return false;
            if (salesPerson && salesPerson !== "All" && salesPerson !== "all" && po.salesPerson !== salesPerson) return false;
            if (state && state !== "All" && state !== "all" && po.state !== state) return false;
            return true;
        });

        // Extract available unique filter options for frontend dropdowns
        const allBrandsSet = new Set(enrichedPOs.map(p => p.brand).filter(Boolean));
        const allClientsSet = new Set(enrichedPOs.map(p => p.client).filter(Boolean));
        const allSalesPersonsSet = new Set(enrichedPOs.map(p => p.salesPerson).filter(Boolean));
        const allStatesSet = new Set(enrichedPOs.map(p => p.state).filter(Boolean));
        const allStatusesSet = new Set(enrichedPOs.map(p => p.status).filter(Boolean));

        // 6. Compute KPIs
        const totalPOs = filteredPOs.length;
        const totalPOValueSum = filteredPOs.reduce((sum, p) => sum + p.poValue, 0);
        const totalInvoicedValueSum = filteredPOs.reduce((sum, p) => sum + p.invoicedValue, 0);
        const pendingInvoiceValueSum = Math.max(0, totalPOValueSum - totalInvoicedValueSum);
        const billingPercentage = totalPOValueSum > 0 ? Number(((totalInvoicedValueSum / totalPOValueSum) * 100).toFixed(2)) : 0;
        const activeClientsCount = new Set(filteredPOs.map(p => p.client).filter(c => c !== "Unassigned Client")).size;

        // 7. Section 1: Brand Wise Purchase Orders
        const brandMap = new Map();
        filteredPOs.forEach(po => {
            po.products.forEach(prod => {
                const bName = prod.brand || po.brand || "Unspecified Brand";
                const linePoVal = prod.total || ((prod.quantity || 1) * (prod.unitPrice || 0));
                const lineInvVal = (prod.invoicedQuantity || 0) * (prod.unitPrice || 0);

                if (!brandMap.has(bName)) {
                    brandMap.set(bName, { brand: bName, poCount: 0, poValue: 0, invoicedValue: 0 });
                }
                const bData = brandMap.get(bName);
                bData.poCount += 1;
                bData.poValue += linePoVal;
                bData.invoicedValue += lineInvVal;
            });
        });

        const brandWiseList = Array.from(brandMap.values())
            .sort((a, b) => b.poValue - a.poValue)
            .slice(0, 6)
            .map(item => ({
                brand: item.brand,
                poCount: item.poCount,
                poValueCr: formatCr(item.poValue),
                invoicedValueCr: formatCr(item.invoicedValue)
            }));

        // 8. Section 2: Client Wise Purchase Orders (Top 10)
        const clientMap = new Map();
        filteredPOs.forEach(po => {
            const cName = po.client;
            if (!clientMap.has(cName)) {
                clientMap.set(cName, { client: cName, poValue: 0, invoicedValue: 0, pendingValue: 0 });
            }
            const cData = clientMap.get(cName);
            cData.poValue += po.poValue;
            cData.invoicedValue += po.invoicedValue;
            cData.pendingValue += po.pendingValue;
        });

        let clientWiseTop10 = Array.from(clientMap.values())
            .sort((a, b) => b.poValue - a.poValue)
            .slice(0, 10)
            .map(item => ({
                client: item.client,
                poValueCr: formatCr(item.poValue),
                invoicedValueCr: formatCr(item.invoicedValue),
                pendingValueCr: formatCr(item.pendingValue)
            }));

        // 9. Section 3: Taxable Value Distribution (By PO Count)
        const ranges = [
            { range: "0 - 1 Lakh", min: 0, max: 100000, poCount: 0, poValue: 0, invoicedValue: 0 },
            { range: "1 - 5 Lakhs", min: 100000, max: 500000, poCount: 0, poValue: 0, invoicedValue: 0 },
            { range: "5 - 10 Lakhs", min: 500000, max: 1000000, poCount: 0, poValue: 0, invoicedValue: 0 },
            { range: "10 - 25 Lakhs", min: 1000000, max: 2500000, poCount: 0, poValue: 0, invoicedValue: 0 },
            { range: "25 Lakhs+", min: 2500000, max: Infinity, poCount: 0, poValue: 0, invoicedValue: 0 }
        ];

        filteredPOs.forEach(po => {
            const val = po.poValue;
            const targetRange = ranges.find(r => val >= r.min && val < r.max) || ranges[ranges.length - 1];
            targetRange.poCount += 1;
            targetRange.poValue += po.poValue;
            targetRange.invoicedValue += po.invoicedValue;
        });

        const valueDistribution = ranges.map(r => ({
            range: r.range,
            poCount: r.poCount,
            poValueCr: formatCr(r.poValue),
            invoicedValueCr: formatCr(r.invoicedValue),
            percentage: totalPOs > 0 ? Number(((r.poCount / totalPOs) * 100).toFixed(1)) : 0
        }));

        // 10. Section 4 & 5: Monthly Trends (Dynamic last 12 months calculated from present)
        const monthlyMap = new Map();
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mKey = `${d.toLocaleString('default', { month: 'short' })}-${String(d.getFullYear()).slice(-2)}`;
            monthlyMap.set(mKey, { month: mKey, poValue: 0, invoicedValue: 0 });
        }

        filteredPOs.forEach(po => {
            const d = new Date(po.rawDate);
            if (!isNaN(d.getTime())) {
                const mKey = `${d.toLocaleString('default', { month: 'short' })}-${String(d.getFullYear()).slice(-2)}`;
                if (monthlyMap.has(mKey)) {
                    const mData = monthlyMap.get(mKey);
                    mData.poValue += po.poValue;
                    mData.invoicedValue += po.invoicedValue;
                }
            }
        });

        const monthlyTrend = Array.from(monthlyMap.values()).map(m => {
            const poValCr = formatCr(m.poValue);
            const invValCr = formatCr(m.invoicedValue);
            const bPct = poValCr > 0 ? Number(((invValCr / poValCr) * 100).toFixed(0)) : 0;
            return {
                month: m.month,
                poValueCr: poValCr,
                invoicedValueCr: invValCr,
                billingPct: bPct
            };
        });

        // 11. Section 6: Latest Purchase Orders
        const latestPOs = filteredPOs.slice(0, 10).map(po => ({
            _id: po._id,
            poNumber: po.poNumber,
            poDate: po.poDate,
            client: po.client,
            brand: po.brand,
            salesPerson: po.salesPerson,
            state: po.state,
            poValue: po.poValue,
            invoicedValue: po.invoicedValue,
            pendingValue: po.pendingValue,
            status: po.status
        }));

        // 12. Section 7: Top Summary
        const topBrandItem = brandWiseList[0] || { brand: "N/A", poValueCr: 0 };
        const topClientItem = clientWiseTop10[0] || { client: "N/A", poValueCr: 0 };

        const topSummary = {
            topBrand: topBrandItem.brand,
            topBrandValueCr: topBrandItem.poValueCr,
            topClient: topClientItem.client,
            topClientValueCr: topClientItem.poValueCr,
            highestInvoicedValueCr: formatCr(totalInvoicedValueSum),
            billingPercentage: billingPercentage
        };

        const responseData = {
            kpis: {
                totalPOs: totalPOs,
                totalPOValueCr: formatCr(totalPOValueSum),
                totalInvoicedValueCr: formatCr(totalInvoicedValueSum),
                pendingInvoiceValueCr: formatCr(pendingInvoiceValueSum),
                billingPercentage: billingPercentage,
                activeClients: activeClientsCount
            },
            brandWise: brandWiseList,
            clientWiseTop10,
            valueDistribution,
            monthlyTrend,
            latestPOs,
            topSummary,
            filterOptions: {
                brands: ["All", ...Array.from(allBrandsSet)],
                clients: ["All", ...Array.from(allClientsSet)],
                salesPersons: ["All", ...Array.from(allSalesPersonsSet)],
                states: ["All", ...Array.from(allStatesSet)],
                statuses: ["All", "Confirmed", "Pending", "Invoiced", "Partially Invoiced", "Dispatched"]
            }
        };

        res.json(responseData);
    } catch (err) {
        console.error("Master Dashboard Controller Error:", err);
        res.status(500).json({ message: "Failed to fetch master dashboard data" });
    }
};

module.exports = {
    getMasterDashboardData
};
