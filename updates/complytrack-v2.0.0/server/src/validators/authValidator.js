const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(100),
  email: Joi.string().required().lowercase().trim().pattern(/@/).message('Invalid email'),
  password: Joi.string().required().min(8).max(128),
  organizationName: Joi.string().trim().max(200),
  companyType: Joi.string().valid('private_limited', 'public_limited', 'one_person', 'llp', 'sole_proprietorship', 'partnership', 'huf', 'society').required(),
  phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).allow('').optional().messages({ 'string.pattern.base': 'Must be a valid 10-digit Indian phone number' }),
  industry: Joi.string().trim().allow(''),
  sector: Joi.string().valid('service', 'manufacturing', 'trading').required(),
  employeeCount: Joi.alternatives().try(Joi.number().integer().min(1), Joi.valid('', null)),
  registrationPath: Joi.string().valid('trial', 'license').required(),
  licenseKey: Joi.when('registrationPath', {
    is: 'license',
    then: Joi.string().required().trim().min(16).max(19).messages({
      'any.required': 'License key is required',
      'string.empty': 'License key is required',
      'string.min': 'Invalid license key format'
    }),
    otherwise: Joi.string().allow('', null).optional()
  }),
  pan: Joi.when('registrationPath', {
    is: 'license',
    then: Joi.string().required().trim().uppercase().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/).messages({
      'any.required': 'PAN is required',
      'string.empty': 'PAN is required',
      'string.pattern.base': 'Invalid PAN format. Expected: AAAAA9999A (e.g., ABCDE1234F)'
    }),
    otherwise: Joi.string().allow('', null).optional()
  })
});

const loginSchema = Joi.object({
  email: Joi.string().required().lowercase().trim().pattern(/@/).message('Invalid email'),
  password: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().required().min(8).max(128)
});

module.exports = { registerSchema, loginSchema, changePasswordSchema };
