import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useRegisterMutation } from '../store/api/api';
import { setCredentials } from '../store/slices/authSlice';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { LogoWithTagline } from '../components/common/Logo';

const INDUSTRIES_BY_SECTOR = {
  service: [
    'Information Technology (IT)',
    'IT-ITeS / BPO / KPO',
    'Telecom',
    'Consulting & Advisory',
    'Digital Marketing & Media',
    'Financial Services & FinTech',
    'Banking & Insurance',
    'Healthcare Services',
    'Education & EdTech',
    'Hospitality & Tourism',
    'Logistics & Supply Chain',
    'Real Estate & Construction',
    'Legal & Accounting Services',
    'Architecture & Interior Design',
    'Advertising & PR',
    'Transportation & Courier',
    'Other Service'
  ],
  manufacturing: [
    'Automobile & Auto Components',
    'Pharmaceuticals & Medical Devices',
    'Textiles & Garments',
    'Food & Beverage Processing',
    'Chemicals & Petrochemicals',
    'Electronics & IT Hardware',
    'Metals, Steel & Foundries',
    'Cement & Building Materials',
    'Plastics & Rubber',
    'Paper & Printing',
    'Engineering & Machinery',
    'Defense & Aerospace',
    'Shipbuilding & Repair',
    'FMCG (Fast Moving Consumer Goods)',
    'Furniture & Wood Products',
    'Other Manufacturing'
  ],
  trading: [
    'Retail (General Store / Kirana)',
    'Grocery & Supermarket',
    'Electronics & Appliances',
    'Clothing & Footwear',
    'Jewellery & Accessories',
    'Furniture & Home Décor',
    'Building Materials & Hardware',
    'Pharmacy & Medical Store',
    'Stationery & Office Supplies',
    'Auto Parts & Accessories',
    'Wholesale / Distribution',
    'E-Commerce & Online Trading',
    'Import & Export Trading',
    'Agricultural Inputs (Seeds, Fertilizers)',
    'Petroleum & Fuel Dealers',
    'Other Trading / Retail'
  ]
};

const COMPANY_TYPES = [
  { id: 'private_limited', name: 'Private Limited (Pvt Ltd)' },
  { id: 'public_limited', name: 'Public Limited (Ltd)' },
  { id: 'one_person', name: 'One Person Company (OPC)' },
  { id: 'llp', name: 'Limited Liability Partnership (LLP)' },
  { id: 'sole_proprietorship', name: 'Sole Proprietorship' },
  { id: 'partnership', name: 'Partnership Firm' },
  { id: 'huf', name: 'Hindu Undivided Family (HUF)' },
  { id: 'society', name: 'Society / Trust / NGO' },
];

const SECTORS = [
  {
    id: 'service',
    name: 'Service Sector',
    description: 'IT, Telecom, BPO, Consulting, Digital Services',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    docs: ['Company Registration Certificate', 'GST Certificate', 'PAN Card']
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing Sector',
    description: 'Factories, Industrial, Production, Assembly',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    docs: ['Company Registration Certificate', 'Factory License', 'Pollution Board Consent', 'PAN Card']
  },
  {
    id: 'trading',
    name: 'Trading Sector',
    description: 'Shops, Retail, Wholesale, Buying & Selling',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
    docs: ['GST Certificate', 'Shop & Establishment License', 'PAN Card']
  }
];

export default function RegistrationFlow() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [register, { isLoading }] = useRegisterMutation();
  
  const [step, setStep] = useState(1);
  const [selectedSector, setSelectedSector] = useState(null);
  const [registrationPath, setRegistrationPath] = useState(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [pan, setPan] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    companyType: '',
    phone: '',
    industry: '',
    employeeCount: ''
  });
  const [errors, setErrors] = useState({});

  if (isAuthenticated || sessionStorage.getItem('user')) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleSectorSelect = (sector) => {
    setSelectedSector(sector);
    setStep(2);
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    if (!form.password || form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (form.password && !/[A-Z]/.test(form.password)) newErrors.password = 'Password must contain an uppercase letter';
    if (form.password && !/[0-9]/.test(form.password)) newErrors.password = 'Password must contain a number';
    if (form.password && !/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) newErrors.password = 'Password must contain a special character';
    if (!form.organizationName.trim()) newErrors.organizationName = 'Company name is required';
    if (!form.companyType) newErrors.companyType = 'Please select company type';
    if (!form.industry) newErrors.industry = 'Please select an industry';
    if (registrationPath !== 'trial') {
      if (!pan.trim()) {
        newErrors.pan = 'PAN is required';
      } else {
        const cleanPan = pan.replace(/[\s-]/g, '').toUpperCase();
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleanPan)) {
          newErrors.pan = 'Invalid PAN format. Expected: AAAAA9999A (e.g., ABCDE1234F)';
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    if (registrationPath === 'license') {
      if (!licenseKey.trim()) {
        setLicenseError('License key is required to activate your account.');
        return;
      }

      const cleanKey = licenseKey.replace(/[\s-]/g, '').toUpperCase();
      if (cleanKey.length !== 16) {
        setLicenseError('Invalid license key format. Must be 16 characters (XXXX-XXXX-XXXX-XXXX).');
        return;
      }
    }

    const cleanPan = pan.replace(/[\s-]/g, '').toUpperCase();

    const payload = {
      ...form,
      sector: selectedSector.id,
      registrationPath: registrationPath || 'trial'
    };

    if (registrationPath === 'license') {
      payload.licenseKey = licenseKey.replace(/[\s-]/g, '').toUpperCase();
      payload.pan = cleanPan;
    }

    Object.keys(payload).forEach(key => {
      if (payload[key] === '' || payload[key] === null) {
        delete payload[key];
      }
    });
    if (payload.employeeCount) {
      payload.employeeCount = Number(payload.employeeCount);
    }

    try {
      const result = await register(payload).unwrap();
      dispatch(setCredentials(result));
      toast.success(registrationPath === 'trial' ? 'Account created! Your 7-day free trial has started.' : 'Account created and license activated!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.data?.message || 'Registration failed';
      setLicenseError(msg);
      toast.error(msg);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
            step >= s ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary/30' : 'bg-slate-100 text-slate-500'
          }`}>
            {s}
          </div>
          {s < 3 && (
            <div className={`w-16 h-1 mx-2 rounded-full transition-all duration-300 ${step > s ? 'bg-gradient-to-r from-primary-400 to-primary-600' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const TRIAL_BENEFITS = [
    '7 days of full access',
    'Up to 5 compliance items',
    'Up to 3 team members',
    'In-app alerts & notifications',
    'Email notifications'
  ];

  return (
    <div className="min-h-screen canvas-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <LogoWithTagline light className="mb-6" />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-200/60">
          {renderStepIndicator()}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Select Your Sector</h2>
              <p className="text-slate-500 text-sm mb-6">Choose your business sector to get tailored compliance requirements</p>
              
              <div className="grid gap-4">
                {SECTORS.map((sector) => (
                  <button
                    key={sector.id}
                    onClick={() => handleSectorSelect(sector)}
                    className={`w-full p-5 border-2 rounded-2xl text-left transition-all duration-200 ${
                      selectedSector?.id === sector.id
                        ? 'border-primary-500 bg-primary-50/60 shadow-md shadow-primary/10'
                        : 'border-slate-200 hover:border-primary-300 hover:bg-primary-50/30'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary-100 text-primary-500 rounded-xl">
                        {sector.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{sector.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{sector.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {sector.docs.map((doc, i) => (
                            <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                              {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Account Details</h2>
                  <p className="text-sm text-slate-500">Sector: <span className="font-medium text-primary-500">{selectedSector?.name}</span></p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Change
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); if (validateStep2()) setStep(3); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${errors.name ? 'border-danger-300' : 'border-slate-200'}`}
                      placeholder="John Doe"
                    />
                    {errors.name && <p className="text-xs text-danger-500 mt-1.5">{errors.name}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${errors.email ? 'border-danger-300' : 'border-slate-200'}`}
                      placeholder="john@company.com"
                    />
                    {errors.email && <p className="text-xs text-danger-500 mt-1.5">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${errors.password ? 'border-danger-300' : 'border-slate-200'}`}
                    placeholder="Min 8 chars, uppercase, number, special char"
                  />
                  {errors.password && <p className="text-xs text-danger-500 mt-1.5">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name *</label>
                  <input
                    type="text"
                    value={form.organizationName}
                    onChange={(e) => handleChange('organizationName', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${errors.organizationName ? 'border-danger-300' : 'border-slate-200'}`}
                    placeholder="Your company name"
                  />
                  {errors.organizationName && <p className="text-xs text-danger-500 mt-1.5">{errors.organizationName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Type *</label>
                  <select
                    value={form.companyType}
                    onChange={(e) => handleChange('companyType', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-white ${errors.companyType ? 'border-danger-300' : 'border-slate-200'}`}
                  >
                    <option value="">Select company type</option>
                    {COMPANY_TYPES.map((ct) => (
                      <option key={ct.id} value={ct.id}>{ct.name}</option>
                    ))}
                  </select>
                  {errors.companyType && <p className="text-xs text-danger-500 mt-1.5">{errors.companyType}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                      placeholder="+91 74994 7550"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Industry *</label>
                    <select
                      value={form.industry}
                      onChange={(e) => handleChange('industry', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-white ${errors.industry ? 'border-danger-300' : 'border-slate-200'}`}
                    >
                      <option value="">Select your industry</option>
                      {(INDUSTRIES_BY_SECTOR[selectedSector?.id] || []).map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                    {errors.industry && <p className="text-xs text-danger-500 mt-1.5">{errors.industry}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">How would you like to register? *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegistrationPath('trial')}
                      className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                        registrationPath === 'trial'
                          ? 'border-primary-500 bg-primary-50/60 shadow-md shadow-primary/10'
                          : 'border-slate-200 hover:border-primary-300 hover:bg-primary-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold text-slate-900">Free Trial</span>
                      </div>
                      <p className="text-xs text-slate-500">7 days free, no license key needed</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationPath('license')}
                      className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                        registrationPath === 'license'
                          ? 'border-primary-500 bg-primary-50/60 shadow-md shadow-primary/10'
                          : 'border-slate-200 hover:border-primary-300 hover:bg-primary-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span className="font-semibold text-slate-900">License Key</span>
                      </div>
                      <p className="text-xs text-slate-500">I have a license key</p>
                    </button>
                  </div>
                  {!registrationPath && <p className="text-xs text-danger-500 mt-1.5">Please select a registration path</p>}
                </div>

                {registrationPath === 'license' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Company PAN *
                      <span className="text-xs text-slate-400 font-normal ml-1">(Format: AAAAA9999A)</span>
                    </label>
                    <input
                      type="text"
                      value={pan}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        setPan(val);
                        if (errors.pan) setErrors({ ...errors, pan: null });
                      }}
                      className={`w-full px-4 py-3 border rounded-xl text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${errors.pan ? 'border-danger-300' : 'border-slate-200'}`}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                    {errors.pan && <p className="text-xs text-danger-500 mt-1.5">{errors.pan}</p>}
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !registrationPath}
                    className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium text-sm hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all duration-200"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : (registrationPath === 'trial' ? 'Start Free Trial' : 'Continue')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && registrationPath === 'trial' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green/30">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Start Your Free Trial</h2>
                <p className="text-sm text-slate-500 mt-1">7 days of full access, no credit card required</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
                <h3 className="font-semibold text-green-800 mb-3">What you get during the trial:</h3>
                <ul className="space-y-2">
                  {TRIAL_BENEFITS.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-green-700">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                <p className="text-xs text-slate-500">
                  <strong>Registration summary:</strong><br />
                  Company: {form.organizationName || '—'}<br />
                  Email: {form.email || '—'}<br />
                  Sector: {selectedSector?.name || '—'}
                </p>
              </div>

              {licenseError && (
                <div className="bg-danger-50 border border-danger-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-danger-700">{licenseError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium text-sm hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green/25 transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Start Free Trial
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 3 && registrationPath === 'license' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary/30">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-slate-900">License Key Required</h2>
                <p className="text-sm text-slate-500 mt-1">A valid license key is required to activate your account</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-700">
                  <strong>Required:</strong> Contact your administrator or sales representative to obtain a license key.
                  The key is linked to your company PAN and cannot be reused.
                </p>
              </div>

              {licenseError && (
                <div className="bg-danger-50 border border-danger-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-danger-700">{licenseError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">License Key *</label>
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => {
                      setLicenseKey(e.target.value.toUpperCase());
                      setLicenseError('');
                    }}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    maxLength={19}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono text-center tracking-wider focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-1.5 text-center">Format: XXXX-XXXX-XXXX-XXXX (16 characters)</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">
                    <strong>Registration summary:</strong><br />
                    Company: {form.organizationName || '—'}<br />
                    PAN: {pan || '—'}<br />
                    Sector: {selectedSector?.name || '—'}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || !licenseKey.trim()}
                    className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium text-sm hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all duration-200"
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Validating with main server...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Create Account & Activate License
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-700 font-semibold transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
