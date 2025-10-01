import React, { useState, useEffect } from 'react';
import { FileText, Download, Plus, Calendar, AlertCircle, CheckCircle, RefreshCw, Cloud } from 'lucide-react';

const PermitLogSystem = () => {
  // CONFIGURATION - Replace with your Google Apps Script URL
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzIXrLd5Ohi-pjx00g0_lckJUjxkbPBBh3BbillaDVUCrVD5r-IjKEdZ1ezKEjcnuIj/exec';
  
  const [project, setProject] = useState('TWS O-16123');
  const [permitType, setPermitType] = useState('');
  const [permits, setPermits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('local'); // 'local', 'syncing', 'synced'

  const projects = ['TWS O-16123', 'TW O-16124'];
  
  const permitTypes = [
    { id: 'confined-space', name: 'SOF-3542-I Confined Space Entry', color: 'bg-blue-100 border-blue-300' },
    { id: 'excavation', name: 'SOF-3542-H Excavation', color: 'bg-green-100 border-green-300' },
    { id: 'work-height', name: 'SOF-3542-E Work at Height', color: 'bg-yellow-100 border-yellow-300' },
    { id: 'lifting', name: 'SOF-3542-C Lifting Operation', color: 'bg-purple-100 border-purple-300' }
  ];

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    location: '',
    contractor: '',
    supervisor: '',
    workDescription: '',
    hazards: '',
    controlMeasures: '',
    permitIssuer: '',
    validFrom: '',
    validTo: '',
    status: 'Active'
  });

  useEffect(() => {
    loadPermits();
  }, [project]);

  const loadPermits = async () => {
    setLoading(true);
    
    // Try to load from Google Sheets first
    if (APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE') {
      try {
        const response = await fetch(`${APPS_SCRIPT_URL}?project=${encodeURIComponent(project)}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const formattedPermits = result.data.map((permit, index) => ({
            id: Date.now() + index,
            project: project,
            date: permit.Date || '',
            time: permit.Time || '',
            permitTypeName: permit['Permit Type'] || '',
            permitType: getPermitTypeId(permit['Permit Type']),
            location: permit.Location || '',
            contractor: permit.Contractor || '',
            supervisor: permit.Supervisor || '',
            workDescription: permit['Work Description'] || '',
            hazards: permit.Hazards || '',
            controlMeasures: permit['Control Measures'] || '',
            permitIssuer: permit['Permit Issuer'] || '',
            validFrom: permit['Valid From'] || '',
            validTo: permit['Valid To'] || '',
            status: permit.Status || 'Active'
          }));
          setPermits(formattedPermits);
          setSyncStatus('synced');
        } else {
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error('Error loading from Google Sheets:', error);
        loadFromLocalStorage();
      }
    } else {
      loadFromLocalStorage();
    }
    
    setLoading(false);
  };

  const loadFromLocalStorage = () => {
    const stored = localStorage.getItem(`permits_${project}`);
    if (stored) {
      setPermits(JSON.parse(stored));
      setSyncStatus('local');
    } else {
      setPermits([]);
    }
  };

  const getPermitTypeId = (typeName) => {
    const type = permitTypes.find(t => typeName && typeName.includes(t.name.split(' ')[0]));
    return type ? type.id : '';
  };

  const savePermits = (newPermits) => {
    localStorage.setItem(`permits_${project}`, JSON.stringify(newPermits));
    setPermits(newPermits);
  };

  const syncToGoogleSheets = async (permitData) => {
    if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
      return false;
    }

    setSyncStatus('syncing');
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          project: project,
          ...permitData
        }),
        mode: 'no-cors'
      });

      setSyncStatus('synced');
      return true;
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error);
      setSyncStatus('local');
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!permitType || !formData.date || !formData.location || !formData.contractor || !formData.supervisor) {
      setNotification('⚠️ Please fill in all required fields!');
      setTimeout(() => setNotification(''), 3000);
      return;
    }
    
    setLoading(true);
    
    const permitTypeName = permitTypes.find(p => p.id === permitType)?.name;
    
    const newPermit = {
      id: Date.now(),
      project,
      permitType,
      permitTypeName,
      ...formData,
      createdAt: new Date().toISOString()
    };

    // Save to local storage first
    const updatedPermits = [newPermit, ...permits];
    savePermits(updatedPermits);
    
    // Try to sync to Google Sheets
    const synced = await syncToGoogleSheets(newPermit);
    
    if (synced || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
      setNotification('✓ Permit logged successfully!' + (synced ? ' (Synced to Google Sheets)' : ''));
    } else {
      setNotification('✓ Permit saved locally. Google Sheets sync pending.');
    }
    
    setTimeout(() => setNotification(''), 4000);
    
    setShowForm(false);
    resetForm();
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      location: '',
      contractor: '',
      supervisor: '',
      workDescription: '',
      hazards: '',
      controlMeasures: '',
      permitIssuer: '',
      validFrom: '',
      validTo: '',
      status: 'Active'
    });
    setPermitType('');
  };

  const downloadCSV = () => {
    const headers = ['Date', 'Time', 'Permit Type', 'Location', 'Contractor', 'Supervisor', 'Work Description', 'Hazards', 'Control Measures', 'Permit Issuer', 'Valid From', 'Valid To', 'Status'];
    
    const rows = permits.map(permit => [
      permit.date,
      permit.time,
      permit.permitTypeName,
      permit.location,
      permit.contractor,
      permit.supervisor,
      permit.workDescription,
      permit.hazards,
      permit.controlMeasures,
      permit.permitIssuer,
      permit.validFrom,
      permit.validTo,
      permit.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Permit_Log_${project}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    setNotification('✓ Log downloaded successfully!');
    setTimeout(() => setNotification(''), 3000);
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? 'text-green-600' : status === 'Closed' ? 'text-gray-500' : 'text-orange-600';
  };

  const getSyncStatusIcon = () => {
    if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
      return <span className="text-xs text-gray-500">Local Storage Only</span>;
    }
    
    switch(syncStatus) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'synced':
        return <Cloud className="w-4 h-4 text-green-500" />;
      default:
        return <Cloud className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Construction Permit Log System</h1>
                <div className="flex items-center gap-2 mt-1">
                  {getSyncStatusIcon()}
                  <span className="text-xs text-gray-500">
                    {syncStatus === 'synced' ? 'Connected to Google Sheets' : 
                     syncStatus === 'syncing' ? 'Syncing...' : 
                     APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE' ? '' : 'Local mode'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              <Plus className="w-5 h-5" />
              New Permit
            </button>
          </div>

          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                disabled={loading}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              >
                {projects.map(proj => (
                  <option key={proj} value={proj}>{proj}</option>
                ))}
              </select>
            </div>

            <div className="flex-1"></div>

            <button
              onClick={loadPermits}
              disabled={loading}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition disabled:bg-gray-400"
              title="Refresh from Google Sheets"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={downloadCSV}
              disabled={permits.length === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Download CSV
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`${notification.includes('✓') ? 'bg-green-100 border-green-400 text-green-700' : 'bg-orange-100 border-orange-400 text-orange-700'} border px-4 py-3 rounded-lg mb-6 flex items-center gap-2`}>
            {notification.includes('✓') ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {notification}
          </div>
        )}

        {/* Setup Notice */}
        {APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Google Sheets Integration Not Configured</h3>
                <p className="text-sm text-blue-800">
                  Currently using local browser storage. To enable Google Sheets sync:
                </p>
                <ol className="text-sm text-blue-800 mt-2 ml-4 list-decimal">
                  <li>Deploy the Apps Script provided in the instructions</li>
                  <li>Replace 'YOUR_APPS_SCRIPT_URL_HERE' in the code with your deployment URL</li>
                  <li>Refresh the page</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">New Permit Entry</h2>
            
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Permit Type *</label>
                  <select
                    value={permitType}
                    onChange={(e) => setPermitType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Permit Type</option>
                    {permitTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Site location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contractor *</label>
                  <input
                    type="text"
                    value={formData.contractor}
                    onChange={(e) => setFormData({...formData, contractor: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contractor name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor *</label>
                  <input
                    type="text"
                    value={formData.supervisor}
                    onChange={(e) => setFormData({...formData, supervisor: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Supervisor name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Description</label>
                  <textarea
                    value={formData.workDescription}
                    onChange={(e) => setFormData({...formData, workDescription: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    rows="2"
                    placeholder="Describe the work to be performed"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hazards Identified</label>
                  <textarea
                    value={formData.hazards}
                    onChange={(e) => setFormData({...formData, hazards: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    rows="2"
                    placeholder="List identified hazards"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Control Measures</label>
                  <textarea
                    value={formData.controlMeasures}
                    onChange={(e) => setFormData({...formData, controlMeasures: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    rows="2"
                    placeholder="Safety control measures in place"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Permit Issuer</label>
                  <input
                    type="text"
                    value={formData.permitIssuer}
                    onChange={(e) => setFormData({...formData, permitIssuer: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Name of permit issuer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input
                    type="datetime-local"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({...formData, validFrom: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid To</label>
                  <input
                    type="datetime-local"
                    value={formData.validTo}
                    onChange={(e) => setFormData({...formData, validTo: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {setShowForm(false); resetForm();}}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                >
                  {loading ? 'Saving...' : 'Save Permit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {permitTypes.map(type => {
            const count = permits.filter(p => p.permitType === type.id).length;
            return (
              <div key={type.id} className={`${type.color} border-2 rounded-lg p-4`}>
                <div className="text-2xl font-bold text-gray-800">{count}</div>
                <div className="text-sm text-gray-600">{type.name.split(' ').slice(1).join(' ')}</div>
              </div>
            );
          })}
        </div>

        {/* Permit Log */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Permit Log - {project}
          </h2>

          {loading && permits.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 mx-auto mb-3 text-blue-500 animate-spin" />
              <p className="text-gray-500">Loading permits...</p>
            </div>
          ) : permits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No permits logged yet. Click "New Permit" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Permit Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contractor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Supervisor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {permits.map(permit => (
                    <tr key={permit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800">{permit.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{permit.time}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {permit.permitTypeName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{permit.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{permit.contractor}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{permit.supervisor}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-semibold ${getStatusColor(permit.status)}`}>
                          {permit.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermitLogSystem;