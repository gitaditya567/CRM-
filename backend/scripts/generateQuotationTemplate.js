const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const path = require('path');
require('dotenv').config();

const Product = require('../models/Product'); // Adjust path if needed

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const generateExcel = async () => {
    await connectDB();

    try {
        const products = await Product.find({}).sort({ brand: 1, productNo: 1 });
        console.log(`Fetched ${products.length} products`);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Enventary';
        workbook.created = new Date();

        // --- 1. Master Data Sheet (Hidden) ---
        const dataSheet = workbook.addWorksheet('MasterData', { state: 'hidden' });

        // Headers for Data
        dataSheet.columns = [
            { header: 'Brand', key: 'brand', width: 20 },
            { header: 'ModelNo', key: 'productNo', width: 25 },
            { header: 'Description', key: 'name', width: 40 },
            { header: 'HSN', key: 'hsn', width: 15 },
            { header: 'UOM', key: 'uom', width: 10 },
            { header: 'Rate', key: 'rate', width: 15 },
            { header: 'GSTRate', key: 'gst', width: 10 },
        ];

        // Populate Data
        const brands = new Set();
        const brandModels = {}; // brand -> [model1, model2]

        products.forEach(p => {
            const brand = p.brand ? p.brand.trim() : 'Unknown';
            const model = p.productNo;
            brands.add(brand);

            if (!brandModels[brand]) brandModels[brand] = [];
            brandModels[brand].push(model);

            dataSheet.addRow({
                brand: brand,
                productNo: model,
                name: p.name || p.description,
                hsn: p.hsnCode,
                uom: p.uom,
                rate: p.retailPriceINR || 0,
                gst: p.gstRate || 18
            });
        });

        // Create Named Ranges for Brands (Unique List)
        // Since ExcelJS doesn't support easy dynamic arrays for validation list sources directly from code without some hacks, 
        // we'll put the unique brands in a column in MasterData and Name it "BrandList".

        const brandListColIndex = 10; // Column J
        const brandListArray = Array.from(brands).sort();
        brandListArray.forEach((b, i) => {
            dataSheet.getCell(i + 2, brandListColIndex).value = b; // Row 2 onwards
        });

        // Define Name "BrandList"
        // Note: ExcelJS definedNames add references.
        const brandListRef = `MasterData!$J$2:$J$${brandListArray.length + 1}`;
        // We will use this ref directly in validation.

        // Create Named Ranges for Models per Brand
        // We put models for each brand in separate columns starting from K
        let colIdx = 11; // Column K
        for (const brand of brandListArray) {
            const sanitizedBrand = brand.replace(/[^a-zA-Z0-9_]/g, '_'); // Replace spaces/special chars with _
            // If brand starts with number, prepend _
            const validName = /^[0-9]/.test(sanitizedBrand) ? `_${sanitizedBrand}` : sanitizedBrand;

            const models = brandModels[brand];
            models.forEach((m, i) => {
                dataSheet.getCell(i + 2, colIdx).value = m;
            });

            // Define Name
            // Define Name
            if (models.length > 0) {
                // Workbook-level defined name 
                // Note: Indirect relies on these names
                const rangeStr = `MasterData!$${dataSheet.getColumn(colIdx).letter}$2:$${dataSheet.getColumn(colIdx).letter}$${models.length + 1}`;
                workbook.definedNames.add(rangeStr, validName);
            }
            colIdx++;
        }


        // --- 2. Quotation Sheet ---
        const sheet = workbook.addWorksheet('Quotation');

        // Layout matching the image
        // Row 1: Merged Title
        sheet.mergeCells('A1:L1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'QUOTATION';
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.font = { bold: true, size: 14 };

        // Headers (Row 3)
        const headers = [
            'Sl.\nNo.', 'Brand', 'Model No/Part\nCode', 'Description',
            'HSN Code', 'UOM', 'QTY', 'Unit Rate (₹)',
            'Taxable Value (₹)', 'GST Rate\n(%)', 'GST Value (₹)', 'Total Value (₹)'
        ];

        // Set Columns widths
        sheet.columns = [
            { key: 'sl', width: 5 },
            { key: 'brand', width: 15 },
            { key: 'model', width: 25 },
            { key: 'desc', width: 40 },
            { key: 'hsn', width: 12 },
            { key: 'uom', width: 8 },
            { key: 'qty', width: 8 },
            { key: 'rate', width: 12 },
            { key: 'taxable', width: 15 },
            { key: 'gstRate', width: 10 },
            { key: 'gstVal', width: 12 },
            { key: 'total', width: 15 },
        ];

        const headerRow = sheet.getRow(3);
        headerRow.values = headers;
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thick' },
                left: { style: 'thin' },
                bottom: { style: 'thick' },
                right: { style: 'thin' }
            };
        });

        // Rows 4 to 200
        for (let i = 4; i <= 200; i++) {
            const row = sheet.getRow(i);

            // Sl No Formula
            row.getCell(1).value = { formula: `IF(C${i}<>"", ROW()-3, "")` };

            // Data Validation: Brand
            row.getCell(2).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [brandListRef] // Reference to MasterData column J
            };

            // Data Validation: Model (Dependent)
            // Uses INDIRECT(SUBSTITUTE(BrandCell, " ", "_"))
            // Note: INDIRECT references the Defined Names we created earlier.
            // Excel validation formula: =INDIRECT(SUBSTITUTE(B4," ","_"))
            row.getCell(3).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`INDIRECT(SUBSTITUTE(B${i}, " ", "_"))`]
            };

            // Formulas for Lookup (VLOOKUP/XLOOKUP)
            // Since ExcelJS writes standard xlsx, naming conflict can happen if we are not careful.
            // We'll use XLOOKUP if available (Excel 2021+), but VLOOKUP is safer for compatibility.
            // MasterData Columns: A=Brand, B=Model, C=Desc, D=HSN, E=UOM, F=Rate, G=GST
            // We lookup by Model No (Col B) in MasterData!B:G.
            // Model=C4.
            // Desc (Matches Col C of MasterData which is 2nd col in range B:G? No, B is 1, C is 2).

            // Description
            row.getCell(4).value = { formula: `IFERROR(VLOOKUP(C${i}, MasterData!B:G, 2, FALSE), "")` };

            // HSN (Col D -> 3)
            row.getCell(5).value = { formula: `IFERROR(VLOOKUP(C${i}, MasterData!B:G, 3, FALSE), "")` };

            // UOM (Col E -> 4)
            row.getCell(6).value = { formula: `IFERROR(VLOOKUP(C${i}, MasterData!B:G, 4, FALSE), "")` };

            // QTY (User Input) - center align
            row.getCell(7).alignment = { horizontal: 'center' };

            // Unit Rate (Col F -> 5)
            row.getCell(8).value = { formula: `IFERROR(VLOOKUP(C${i}, MasterData!B:G, 5, FALSE), "")` };

            // Taxable Value = Qty * Rate
            row.getCell(9).value = { formula: `IF(AND(G${i}<>"", H${i}<>""), G${i}*H${i}, "")` };

            // GST Rate (Col G -> 6)
            row.getCell(10).value = { formula: `IFERROR(VLOOKUP(C${i}, MasterData!B:G, 6, FALSE), 18)` };

            // GST Value = Taxable * GSTRate%
            row.getCell(11).value = { formula: `IF(I${i}<>"", I${i}*J${i}/100, "")` };

            // Total Value = Taxable + GST Value
            row.getCell(12).value = { formula: `IF(I${i}<>"", I${i}+K${i}, "")` };

            // Styling
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                if (colNumber > 6) cell.alignment = { horizontal: 'right' }; // Numbers right aligned
            });
        }

        // --- Footer ---
        const lastRow = 200;
        const footerStart = lastRow + 1;

        // Itemised Total
        sheet.mergeCells(`A${footerStart}:F${footerStart}`);
        sheet.getCell(`A${footerStart}`).value = 'Itemised Total';
        sheet.getCell(`A${footerStart}`).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell(`A${footerStart}`).font = { bold: true };

        sheet.getCell(`G${footerStart}`).value = { formula: `SUM(G4:G${lastRow})` }; // Total Qty
        sheet.getCell(`I${footerStart}`).value = { formula: `SUM(I4:I${lastRow})` }; // Total Taxable
        sheet.getCell(`K${footerStart}`).value = { formula: `SUM(K4:K${lastRow})` }; // Total GST
        sheet.getCell(`L${footerStart}`).value = { formula: `SUM(L4:L${lastRow})` }; // Grand Total Items

        // Installation Charges
        const installRow = footerStart + 1;
        sheet.mergeCells(`A${installRow}:F${installRow}`);
        sheet.getCell(`A${installRow}`).value = 'INSTALLATION/SERVICE CHARGES (IF APPLICABLE)';
        sheet.getCell(`A${installRow}`).font = { bold: true };

        // User Inputs Qty, Rate
        // Formula for Total = Qty * Rate * 1.18 (Assuming 18% GST on service)
        // Or mirroring the top row logic.
        // Let's assume standard logic as per screenshot: 
        // Qty | Rate | Taxable | GST Rate | GST Value | Total
        // Screenshot Row 26: 10 | 1000 | 2000 | 18 | 118 | 2118 ??? 
        // Wait, screenshot says: Qty 10, Rate 1000, Taxable 2000? That's not right. 10*1000=10000. 
        // Ah, in screenshot: Qty 10, Rate 1000 -> Taxable 2000? Maybe Rate was 200? Or Qty was 2? 
        // Screenshot Row 25: Itemised Total (Qty 1: 10160).
        // Screenshot Row 26: Installation -> Qty 10??, Rate 1000. Taxable 2000. This math is weird. 2*1000=2000. Qty might be 2.
        // I will implement standard logic: Taxable = Qty * Rate.

        // Formulas for Installation
        sheet.getCell(`G${installRow}`).value = 1; // Default Qty
        sheet.getCell(`H${installRow}`).value = 0; // Default Rate
        sheet.getCell(`I${installRow}`).value = { formula: `G${installRow}*H${installRow}` };
        sheet.getCell(`J${installRow}`).value = 18; // GST Rate
        sheet.getCell(`K${installRow}`).value = { formula: `I${installRow}*J${installRow}/100` };
        sheet.getCell(`L${installRow}`).value = { formula: `I${installRow}+K${installRow}` };

        // Freight
        const freightRow = footerStart + 2;
        sheet.mergeCells(`A${freightRow}:F${freightRow}`);
        sheet.getCell(`A${freightRow}`).value = 'CARTAGE/FREIGHT/INSURANCE (IF ANY)';
        sheet.getCell(`A${freightRow}`).font = { bold: true };

        sheet.getCell(`G${freightRow}`).value = 1;
        sheet.getCell(`H${freightRow}`).value = 0;
        sheet.getCell(`I${freightRow}`).value = { formula: `G${freightRow}*H${freightRow}` };
        sheet.getCell(`J${freightRow}`).value = 18;
        sheet.getCell(`K${freightRow}`).value = { formula: `I${freightRow}*J${freightRow}/100` };
        sheet.getCell(`L${freightRow}`).value = { formula: `I${freightRow}+K${freightRow}` };

        // Styling Footer
        [footerStart, installRow, freightRow].forEach(r => {
            sheet.getRow(r).eachCell({ includeEmpty: true }, cell => {
                cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            });
        });

        // Totals Block
        const subTotalRow = freightRow + 1;
        sheet.getCell(`K${subTotalRow}`).value = 'Sub Total';
        sheet.getCell(`K${subTotalRow}`).font = { bold: true };
        sheet.getCell(`L${subTotalRow}`).value = { formula: `L${footerStart}+L${installRow}+L${freightRow}` };
        sheet.getCell(`L${subTotalRow}`).font = { bold: true };

        const roundOffRow = subTotalRow + 1;
        sheet.getCell(`K${roundOffRow}`).value = 'Round Off (+/-)';
        sheet.getCell(`K${roundOffRow}`).font = { bold: true };
        sheet.getCell(`L${roundOffRow}`).value = { formula: `ROUND(L${subTotalRow},0)-L${subTotalRow}` }; // Auto calc round off

        const grandTotalRow = roundOffRow + 1;
        sheet.getCell(`K${grandTotalRow}`).value = 'Grand Total';
        sheet.getCell(`K${grandTotalRow}`).font = { bold: true };
        sheet.getCell(`L${grandTotalRow}`).value = { formula: `L${subTotalRow}+L${roundOffRow}` };
        sheet.getCell(`L${grandTotalRow}`).font = { bold: true };

        // Border for Grand Total
        sheet.getCell(`L${grandTotalRow}`).border = { top: { style: 'thick' }, bottom: { style: 'thick' }, left: { style: 'thick' }, right: { style: 'thick' } };


        // Output File
        const outputPath = path.join(__dirname, '../../Quotation_Template.xlsx');
        await workbook.xlsx.writeFile(outputPath);
        console.log(`Excel file created at: ${outputPath}`);

        process.exit(0);

    } catch (err) {
        console.error('Error generating Excel:', err);
        process.exit(1);
    }
};

generateExcel();
