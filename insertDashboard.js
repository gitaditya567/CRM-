const fs = require('fs');

const dashboardCode = `
    const UnifiedSalesDashboard = () => {
        const [activeSalesTab, setActiveSalesTab] = useState("total"); // total, my, assign, quotation, leadStatus, add
        const currentUserName = localStorage.getItem("name");
        const currentUser = users.find(u => u.name === currentUserName);
        const currentUserId = currentUser?._id;

        const counts = {
            qualified: leads.filter(l => l.status === 'Qualified').length,
            total: leads.length,
            my: leads.filter(l => l.assignedTo?._id === currentUserId || l.assignedTo === currentUserId || l.source === currentUserName).length,
            assign: leads.filter(l => !!l.assignedTo).length,
            won: leads.filter(l => l.status === 'Won').length,
            lost: leads.filter(l => l.status === 'Lost').length,
            pendingQuotes: quotations.filter(q => q.status?.toLowerCase() === 'pending').length || 0
        };

        const tabs = [
            { id: 'total', name: 'Total Leads', icon: "🟢" },
            { id: 'my', name: 'My Leads', icon: "👤" },
            { id: 'assign', name: 'Assign Leads', icon: "✅" },
            { id: 'quotation', name: 'Quotation Status', icon: "📄" },
            { id: 'leadStatus', name: 'Lead Status', icon: "📊" },
            { id: 'add', name: 'Add New Lead', icon: "➕" }
        ];

        const Section = ({ title, data, color, count }) => (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all">
                <div className={\`\${color} text-white px-8 py-4 flex justify-between items-center\`}>
                    <h3 className="text-xl font-black uppercase tracking-widest">{title}</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase">Count</span>
                        <span className="text-2xl font-black">{count}</span>
                    </div>
                </div>
                <div className="p-1">
                    <TableView data={data} type="Leads" />
                </div>
            </div>
        );

        return (
            <div className="max-w-[1600px] mx-auto p-4 md:p-8">
                {/* Header Sub*/}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6 mb-8">
                    <div>
                        <h2 className="text-4xl font-extrabold text-gray-800 dark:text-white tracking-tight flex items-center gap-3">
                            <span className="text-blue-600">TeamInspire</span> <span className="text-gray-300 font-light text-2xl">| {(userRole?.toLowerCase() === 'sales' || userRole?.toLowerCase() === 'services') && activeTab === 'quotations' ? "Quotation Management" : "Lead Management"}</span>
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            {(userRole?.toLowerCase() === 'sales' || userRole?.toLowerCase() === 'services') && activeTab === 'quotations' ? "Manage, track, and generate quotations for your clients." : "Organize leads, track clients, and grow your business."}
                        </p>
                    </div>
                </div>

                {/* Internal Sales Tabs */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-8 w-fit overflow-x-auto max-w-full">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (tab.id === 'add') {
                                    openModal();
                                } else {
                                    setActiveSalesTab(tab.id);
                                }
                            }}
                            className={\`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all \${activeSalesTab === tab.id
                                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm scale-105"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }\`}
                        >
                            <span className="text-lg">{tab.icon}</span>
                            {tab.name}
                        </button>
                    ))}
                </div>

                <div className="transition-all duration-300">
                    {activeSalesTab === 'total' && (
                        <Section title="Total Leads" data={leads} color="bg-yellow-500" count={counts.total} />
                    )}

                    {activeSalesTab === 'my' && (
                        <Section title="My Leads" data={leads.filter(l => l.assignedTo?._id === currentUserId || l.assignedTo === currentUserId || l.source === currentUserName)} color="bg-orange-500" count={counts.my} />
                    )}

                    {activeSalesTab === 'assign' && (
                        <Section title="Assign Leads" data={leads.filter(l => !!l.assignedTo)} color="bg-purple-500" count={counts.assign} />
                    )}

                    {activeSalesTab === 'quotation' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700">
                                <h4 className="text-sm font-black text-gray-400 uppercase mb-6 tracking-widest border-b pb-2">Quotation Analytics</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/20 text-center">
                                        <p className="text-4xl font-black text-red-600 dark:text-red-400">{counts.pendingQuotes}</p>
                                        <p className="text-xs uppercase font-bold text-red-500 mt-1">Pending Review</p>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-2xl border border-green-100 dark:border-green-900/20 text-center">
                                        <p className="text-4xl font-black text-green-600 dark:text-green-400">{counts.qualified}</p>
                                        <p className="text-xs uppercase font-bold text-green-500 mt-1">Qualified Leads</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl flex flex-col justify-center">
                                <h4 className="text-xs font-bold uppercase opacity-70 tracking-widest mb-2">System Performance</h4>
                                <p className="text-5xl font-black mb-1">{Math.round((counts.won / (counts.total || 1)) * 100)}%</p>
                                <p className="text-sm font-medium opacity-90">Overall Lead Conversion Success Rate</p>
                            </div>
                        </div>
                    )}

                    {activeSalesTab === 'leadStatus' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700">
                               <h4 className="text-sm font-black text-gray-400 uppercase mb-6 tracking-widest border-b pb-2">Final Outcomes</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/20 text-center">
                                        <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{counts.won}</p>
                                        <p className="text-xs uppercase font-bold text-indigo-500 mt-1">Total Won</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/10 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/20 text-center">
                                        <p className="text-4xl font-black text-gray-600 dark:text-gray-400">{counts.lost}</p>
                                        <p className="text-xs uppercase font-bold text-gray-500 mt-1">Total Lost</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                                <div className="text-center">
                                 <p className="text-7xl font-black text-blue-600 mb-2">{counts.qualified}</p>
                                 <p className="text-sm font-black uppercase text-gray-400 tracking-widest">Active Pipeline</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

`;

const path = 'frontend/src/pages/Leads.jsx';
let content = fs.readFileSync(path, 'utf8');

// Insert the UnifiedSalesDashboard right before the return statement inside TeamInspire component
const searchStr = 'return (\\n        <div className="min-h-screen';
if (!content.includes('const UnifiedSalesDashboard')) {
    content = content.replace(searchStr, dashboardCode + searchStr);
}

// Modify the main return statement to render UnifiedSalesDashboard for Sales/Services
// Instead of complex regex, we can replace the return section
const renderStr = \`
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">\`;

if(!content.includes(' <UnifiedSalesDashboard />')) {
  const replaceRender = \`
            {(userRole?.toLowerCase() === 'sales' || userRole?.toLowerCase() === 'services') && !(new URLSearchParams(location.search).get("action") === "update") ? (
                <UnifiedSalesDashboard />
            ) : (
                <div className="p-6 md:p-12">
                    <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">\`;
    content = content.replace(renderStr, replaceRender);

    // Now append the enclosing tags if we added the ternary
    const endStr = \`                    )}
                </div>
            </div>

            {/* Lead Modal */}\`;
    
    const replaceEnd = \`                    )}
                </div>
            </div>
            )}
            {/* Lead Modal */}\`;
    content = content.replace(endStr, replaceEnd);
}

// Also fix Quotation Table Status Column. "Remove the status column" and Fix delete role permission
// We need to find where Quotations are mapped
content = content.replace(/<th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status<\\/th>/g, '');

content = content.replace(
    /{q\.status !== 'Draft' && \\([\\s\\S]*?<span className={\`px-2 py-1 text-xs font-bold rounded-full \\${q.status === 'Accepted' \\?'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}\`}>[\\s\\S]*?{q\.status}[\\s\\S]*?<\\/span>[\\s\\S]*?\\)}/g, 
    ''
);


fs.writeFileSync(path, content, 'utf8');
console.log('Restored UnifiedSalesDashboard and patched Quotation table');
