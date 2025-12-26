// Country-specific bank account validations for LATAM

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface CountryValidation {
  code: string;
  accountField: string;
  accountFieldLabel: string;
  length: number | null;
  placeholder: string;
  validate: (value: string) => ValidationResult;
  additionalFields?: {
    name: string;
    label: string;
    placeholder: string;
    required?: boolean;
  }[];
}

// ============= VALIDATION FUNCTIONS =============

/**
 * Validates Mexican CLABE (Clave Bancaria Estandarizada)
 * Uses Mod 10 algorithm per Banxico standards
 */
export function validateCLABE(clabe: string): ValidationResult {
  const digits = clabe.replace(/\D/g, '');
  
  if (digits.length !== 18) {
    return { isValid: false, error: 'La CLABE debe tener exactamente 18 dígitos' };
  }

  // CLABE mod 10 validation weights
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  
  for (let i = 0; i < 17; i++) {
    const product = parseInt(digits[i]) * weights[i];
    sum += product % 10;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  const isValid = checkDigit === parseInt(digits[17]);
  
  return { 
    isValid, 
    error: isValid ? undefined : 'CLABE inválida - dígito verificador incorrecto' 
  };
}

/**
 * Validates Argentine CBU (Clave Bancaria Uniforme) 
 * 22 digits with two verification digits
 */
export function validateCBU(cbu: string): ValidationResult {
  const digits = cbu.replace(/\D/g, '');
  
  if (digits.length !== 22) {
    return { isValid: false, error: 'El CBU debe tener exactamente 22 dígitos' };
  }

  // First block validation (bank code + branch + check digit) - positions 0-7
  const weights1 = [7, 1, 3, 9, 7, 1, 3];
  let sum1 = 0;
  for (let i = 0; i < 7; i++) {
    sum1 += parseInt(digits[i]) * weights1[i];
  }
  const check1 = (10 - (sum1 % 10)) % 10;
  
  if (check1 !== parseInt(digits[7])) {
    return { isValid: false, error: 'CBU inválido - primer dígito verificador incorrecto' };
  }

  // Second block validation (account number + check digit) - positions 8-21
  const weights2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(digits[i + 8]) * weights2[i];
  }
  const check2 = (10 - (sum2 % 10)) % 10;
  
  const isValid = check2 === parseInt(digits[21]);
  
  return { 
    isValid, 
    error: isValid ? undefined : 'CBU inválido - segundo dígito verificador incorrecto' 
  };
}

/**
 * Validates CVU (Clave Virtual Uniforme) - Argentina digital wallets
 * Same format as CBU but starts with "000" 
 */
export function validateCVU(cvu: string): ValidationResult {
  const digits = cvu.replace(/\D/g, '');
  
  if (digits.length !== 22) {
    return { isValid: false, error: 'El CVU debe tener exactamente 22 dígitos' };
  }

  // CVU starts with "000"
  if (!digits.startsWith('000')) {
    return { isValid: false, error: 'El CVU debe comenzar con 000' };
  }

  // Rest of validation follows CBU algorithm
  return validateCBU(cvu);
}

/**
 * Validates Peruvian CCI (Código de Cuenta Interbancario)
 * 20 digits format
 */
export function validateCCI(cci: string): ValidationResult {
  const digits = cci.replace(/\D/g, '');
  
  if (digits.length !== 20) {
    return { isValid: false, error: 'El CCI debe tener exactamente 20 dígitos' };
  }

  // Basic format validation - first 3 digits are bank code
  const bankCode = digits.substring(0, 3);
  const validBankCodes = ['002', '003', '007', '009', '011', '018', '022', '023', '035', '038', '043', '049', '053', '054', '055', '056', '058'];
  
  // We allow any bank code since there might be new ones
  // Just validate the length
  return { isValid: true };
}

/**
 * Validates Colombian bank accounts
 * Variable length depending on bank type
 */
export function validateColombiaAccount(account: string, accountType?: 'ahorro' | 'corriente'): ValidationResult {
  const digits = account.replace(/\D/g, '');
  
  if (digits.length < 9 || digits.length > 16) {
    return { isValid: false, error: 'El número de cuenta debe tener entre 9 y 16 dígitos' };
  }

  return { isValid: true };
}

/**
 * Validates Chilean RUT (Rol Único Tributario)
 * Format: XX.XXX.XXX-X or XXXXXXXX-X
 */
export function validateRUT(rut: string): ValidationResult {
  const cleanRut = rut.replace(/[.-]/g, '').toUpperCase();
  
  if (cleanRut.length < 8 || cleanRut.length > 9) {
    return { isValid: false, error: 'El RUT debe tener 8-9 caracteres' };
  }

  const body = cleanRut.slice(0, -1);
  const checkDigit = cleanRut.slice(-1);
  
  // Validate that body contains only digits
  if (!/^\d+$/.test(body)) {
    return { isValid: false, error: 'El RUT contiene caracteres inválidos' };
  }

  // Calculate check digit
  let sum = 0;
  let multiplier = 2;
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const remainder = sum % 11;
  const calculatedCheck = 11 - remainder;
  let expectedCheck: string;
  
  if (calculatedCheck === 11) {
    expectedCheck = '0';
  } else if (calculatedCheck === 10) {
    expectedCheck = 'K';
  } else {
    expectedCheck = calculatedCheck.toString();
  }
  
  const isValid = checkDigit === expectedCheck;
  
  return { 
    isValid, 
    error: isValid ? undefined : 'RUT inválido - dígito verificador incorrecto' 
  };
}

/**
 * Validates Brazilian CPF (Cadastro de Pessoas Físicas)
 * 11 digits with 2 verification digits
 */
export function validateCPF(cpf: string): ValidationResult {
  const digits = cpf.replace(/\D/g, '');
  
  if (digits.length !== 11) {
    return { isValid: false, error: 'El CPF debe tener exactamente 11 dígitos' };
  }

  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(digits)) {
    return { isValid: false, error: 'CPF inválido' };
  }

  // First check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let check1 = 11 - (sum % 11);
  if (check1 >= 10) check1 = 0;
  
  if (check1 !== parseInt(digits[9])) {
    return { isValid: false, error: 'CPF inválido - primer dígito verificador incorrecto' };
  }

  // Second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  let check2 = 11 - (sum % 11);
  if (check2 >= 10) check2 = 0;
  
  const isValid = check2 === parseInt(digits[10]);
  
  return { 
    isValid, 
    error: isValid ? undefined : 'CPF inválido - segundo dígito verificador incorrecto' 
  };
}

/**
 * Validates Chilean bank account
 * Variable format depending on bank
 */
export function validateChileAccount(account: string): ValidationResult {
  const digits = account.replace(/\D/g, '');
  
  if (digits.length < 7 || digits.length > 16) {
    return { isValid: false, error: 'El número de cuenta debe tener entre 7 y 16 dígitos' };
  }

  return { isValid: true };
}

/**
 * Validates Brazilian bank account (Agência + Conta)
 * Format varies by bank
 */
export function validateBrazilAccount(agencia: string, conta: string): ValidationResult {
  const agenciaDigits = agencia.replace(/\D/g, '');
  const contaDigits = conta.replace(/\D/g, '');
  
  if (agenciaDigits.length < 4 || agenciaDigits.length > 5) {
    return { isValid: false, error: 'La agencia debe tener 4-5 dígitos' };
  }

  if (contaDigits.length < 5 || contaDigits.length > 12) {
    return { isValid: false, error: 'La cuenta debe tener entre 5 y 12 dígitos' };
  }

  return { isValid: true };
}

// Simple format-only validation (length check)
export function validateAccountByLength(value: string, length: number | null): ValidationResult {
  if (length === null) {
    // Variable length - just check it's not empty
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) {
      return { isValid: false, error: 'El número de cuenta es requerido' };
    }
    return { isValid: true };
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length !== length) {
    return { isValid: false, error: `Debe tener exactamente ${length} dígitos` };
  }
  return { isValid: true };
}

// ============= COUNTRY VALIDATIONS CONFIG =============

export const COUNTRY_VALIDATIONS: Record<string, CountryValidation> = {
  MX: {
    code: 'MX',
    accountField: 'clabe',
    accountFieldLabel: 'CLABE interbancaria',
    length: 18,
    placeholder: '000000000000000000',
    validate: (value) => validateCLABE(value),
  },
  AR: {
    code: 'AR',
    accountField: 'cbu',
    accountFieldLabel: 'CBU / CVU',
    length: 22,
    placeholder: '0000000000000000000000',
    validate: (value) => {
      // Allow both CBU and CVU
      if (value.replace(/\D/g, '').startsWith('000')) {
        return validateCVU(value);
      }
      return validateCBU(value);
    },
  },
  CO: {
    code: 'CO',
    accountField: 'account_number',
    accountFieldLabel: 'Número de cuenta',
    length: null,
    placeholder: 'Número de cuenta bancaria',
    validate: (value) => validateColombiaAccount(value),
    additionalFields: [
      {
        name: 'account_type',
        label: 'Tipo de cuenta',
        placeholder: 'Ahorros / Corriente',
        required: true,
      },
    ],
  },
  CL: {
    code: 'CL',
    accountField: 'account_number',
    accountFieldLabel: 'Número de cuenta',
    length: null,
    placeholder: 'Número de cuenta bancaria',
    validate: (value) => validateChileAccount(value),
    additionalFields: [
      {
        name: 'rut',
        label: 'RUT del titular',
        placeholder: '12.345.678-9',
        required: true,
      },
      {
        name: 'account_type',
        label: 'Tipo de cuenta',
        placeholder: 'Cuenta Corriente / Vista / RUT',
        required: true,
      },
    ],
  },
  PE: {
    code: 'PE',
    accountField: 'cci',
    accountFieldLabel: 'CCI (Código Cuenta Interbancario)',
    length: 20,
    placeholder: '00000000000000000000',
    validate: (value) => validateCCI(value),
  },
  BR: {
    code: 'BR',
    accountField: 'account_number',
    accountFieldLabel: 'Conta',
    length: null,
    placeholder: 'Número da conta',
    validate: (value) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 5) {
        return { isValid: false, error: 'La cuenta debe tener al menos 5 dígitos' };
      }
      return { isValid: true };
    },
    additionalFields: [
      {
        name: 'agencia',
        label: 'Agência',
        placeholder: '0000',
        required: true,
      },
      {
        name: 'cpf',
        label: 'CPF del titular',
        placeholder: '000.000.000-00',
        required: true,
      },
    ],
  },
};

// Get validation config for a country
export function getCountryValidation(countryCode: string): CountryValidation | undefined {
  return COUNTRY_VALIDATIONS[countryCode];
}

// Generic validation based on country
export function validateBankAccount(countryCode: string, value: string): ValidationResult {
  const validation = COUNTRY_VALIDATIONS[countryCode];
  if (!validation) {
    // Unknown country - just validate it's not empty
    if (!value.trim()) {
      return { isValid: false, error: 'El número de cuenta es requerido' };
    }
    return { isValid: true };
  }
  return validation.validate(value);
}

// Format account number for display (add separators)
export function formatAccountNumber(value: string, countryCode: string): string {
  const digits = value.replace(/\D/g, '');
  
  switch (countryCode) {
    case 'MX':
      // CLABE: groups of 3-3-11-1
      if (digits.length <= 18) {
        return digits;
      }
      break;
    case 'AR':
      // CBU/CVU: groups of 8-14
      if (digits.length <= 22) {
        return digits;
      }
      break;
    case 'BR':
      // Conta brasileira con guión antes del dígito verificador
      if (digits.length > 1) {
        return `${digits.slice(0, -1)}-${digits.slice(-1)}`;
      }
      break;
  }
  
  return digits;
}

// Format RUT for display (XX.XXX.XXX-X)
export function formatRUT(value: string): string {
  const clean = value.replace(/[^\dkK]/g, '').toUpperCase();
  if (clean.length <= 1) return clean;
  
  const body = clean.slice(0, -1);
  const check = clean.slice(-1);
  
  // Add dots every 3 digits from right
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${formatted}-${check}`;
}

// Format CPF for display (XXX.XXX.XXX-XX)
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
