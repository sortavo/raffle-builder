// LATAM banks configuration with brand colors organized by country

export interface BankConfig {
  name: string;
  shortName: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export interface CountryConfig {
  name: string;
  code: string;
  flag: string;
  accountFormat: {
    name: string;
    label: string;
    length: number | null;
    placeholder: string;
  };
  banks: BankConfig[];
}

// ============= MEXICO =============
const MEXICO_BANKS: BankConfig[] = [
  { name: 'BBVA México', shortName: 'BBVA', bgColor: 'bg-[#004481]', textColor: 'text-white', borderColor: 'border-[#004481]' },
  { name: 'Santander México', shortName: 'Santander', bgColor: 'bg-[#EC0000]', textColor: 'text-white', borderColor: 'border-[#EC0000]' },
  { name: 'Banorte', shortName: 'Banorte', bgColor: 'bg-[#E30613]', textColor: 'text-white', borderColor: 'border-[#E30613]' },
  { name: 'HSBC México', shortName: 'HSBC', bgColor: 'bg-[#DB0011]', textColor: 'text-white', borderColor: 'border-[#DB0011]' },
  { name: 'Citibanamex', shortName: 'Banamex', bgColor: 'bg-[#1E3C70]', textColor: 'text-white', borderColor: 'border-[#1E3C70]' },
  { name: 'Scotiabank', shortName: 'Scotia', bgColor: 'bg-[#EC111A]', textColor: 'text-white', borderColor: 'border-[#EC111A]' },
  { name: 'Banco Azteca', shortName: 'Azteca', bgColor: 'bg-[#00A651]', textColor: 'text-white', borderColor: 'border-[#00A651]' },
  { name: 'Banco Inbursa', shortName: 'Inbursa', bgColor: 'bg-[#003366]', textColor: 'text-white', borderColor: 'border-[#003366]' },
  { name: 'BanCoppel', shortName: 'Coppel', bgColor: 'bg-[#FFD100]', textColor: 'text-black', borderColor: 'border-[#FFD100]' },
  { name: 'Banregio', shortName: 'Banregio', bgColor: 'bg-[#FF6B00]', textColor: 'text-white', borderColor: 'border-[#FF6B00]' },
  { name: 'Afirme', shortName: 'Afirme', bgColor: 'bg-[#00529B]', textColor: 'text-white', borderColor: 'border-[#00529B]' },
  { name: 'Banco del Bajío', shortName: 'Bajío', bgColor: 'bg-[#005A30]', textColor: 'text-white', borderColor: 'border-[#005A30]' },
  { name: 'Banco Autofin', shortName: 'Autofin', bgColor: 'bg-[#1A1A1A]', textColor: 'text-white', borderColor: 'border-[#1A1A1A]' },
  { name: 'Compartamos Banco', shortName: 'Compartamos', bgColor: 'bg-[#00A19A]', textColor: 'text-white', borderColor: 'border-[#00A19A]' },
  { name: 'Hey Banco', shortName: 'Hey', bgColor: 'bg-[#FF6B00]', textColor: 'text-white', borderColor: 'border-[#FF6B00]' },
  { name: 'Nu México', shortName: 'Nu', bgColor: 'bg-[#820AD1]', textColor: 'text-white', borderColor: 'border-[#820AD1]' },
  { name: 'Klar', shortName: 'Klar', bgColor: 'bg-[#00D4AA]', textColor: 'text-black', borderColor: 'border-[#00D4AA]' },
  { name: 'Stori', shortName: 'Stori', bgColor: 'bg-[#00C2FF]', textColor: 'text-black', borderColor: 'border-[#00C2FF]' },
  { name: 'Rappi', shortName: 'Rappi', bgColor: 'bg-[#FF4D00]', textColor: 'text-white', borderColor: 'border-[#FF4D00]' },
  { name: 'Spin by OXXO', shortName: 'Spin', bgColor: 'bg-[#CC0000]', textColor: 'text-white', borderColor: 'border-[#CC0000]' },
  { name: 'BBVA Spark', shortName: 'Spark', bgColor: 'bg-[#004481]', textColor: 'text-white', borderColor: 'border-[#004481]' },
  { name: 'Mercado Pago', shortName: 'MP', bgColor: 'bg-[#00BCFF]', textColor: 'text-white', borderColor: 'border-[#00BCFF]' },
  { name: 'Cuenca', shortName: 'Cuenca', bgColor: 'bg-[#5D3FD3]', textColor: 'text-white', borderColor: 'border-[#5D3FD3]' },
  { name: 'Fondeadora', shortName: 'Fondeadora', bgColor: 'bg-[#FF3366]', textColor: 'text-white', borderColor: 'border-[#FF3366]' },
  { name: 'Albo', shortName: 'Albo', bgColor: 'bg-[#6C63FF]', textColor: 'text-white', borderColor: 'border-[#6C63FF]' },
];

// ============= ARGENTINA =============
const ARGENTINA_BANKS: BankConfig[] = [
  { name: 'Banco Galicia', shortName: 'Galicia', bgColor: 'bg-[#FF6B00]', textColor: 'text-white', borderColor: 'border-[#FF6B00]' },
  { name: 'Banco Santander Río', shortName: 'Santander', bgColor: 'bg-[#EC0000]', textColor: 'text-white', borderColor: 'border-[#EC0000]' },
  { name: 'BBVA Argentina', shortName: 'BBVA', bgColor: 'bg-[#004481]', textColor: 'text-white', borderColor: 'border-[#004481]' },
  { name: 'Banco Macro', shortName: 'Macro', bgColor: 'bg-[#005BAA]', textColor: 'text-white', borderColor: 'border-[#005BAA]' },
  { name: 'Banco Nación', shortName: 'Nación', bgColor: 'bg-[#0066CC]', textColor: 'text-white', borderColor: 'border-[#0066CC]' },
  { name: 'Banco Provincia', shortName: 'Provincia', bgColor: 'bg-[#00A94F]', textColor: 'text-white', borderColor: 'border-[#00A94F]' },
  { name: 'Banco Ciudad', shortName: 'Ciudad', bgColor: 'bg-[#E31837]', textColor: 'text-white', borderColor: 'border-[#E31837]' },
  { name: 'HSBC Argentina', shortName: 'HSBC', bgColor: 'bg-[#DB0011]', textColor: 'text-white', borderColor: 'border-[#DB0011]' },
  { name: 'Banco Credicoop', shortName: 'Credicoop', bgColor: 'bg-[#00539B]', textColor: 'text-white', borderColor: 'border-[#00539B]' },
  { name: 'Banco Supervielle', shortName: 'Supervielle', bgColor: 'bg-[#0066B3]', textColor: 'text-white', borderColor: 'border-[#0066B3]' },
  { name: 'Banco Hipotecario', shortName: 'Hipotecario', bgColor: 'bg-[#003366]', textColor: 'text-white', borderColor: 'border-[#003366]' },
  { name: 'Banco Patagonia', shortName: 'Patagonia', bgColor: 'bg-[#003E7E]', textColor: 'text-white', borderColor: 'border-[#003E7E]' },
  { name: 'Banco ICBC', shortName: 'ICBC', bgColor: 'bg-[#C8102E]', textColor: 'text-white', borderColor: 'border-[#C8102E]' },
  { name: 'Banco Comafi', shortName: 'Comafi', bgColor: 'bg-[#003D7C]', textColor: 'text-white', borderColor: 'border-[#003D7C]' },
  { name: 'Mercado Pago', shortName: 'MP', bgColor: 'bg-[#00BCFF]', textColor: 'text-white', borderColor: 'border-[#00BCFF]' },
  { name: 'Ualá', shortName: 'Ualá', bgColor: 'bg-[#FF5A5F]', textColor: 'text-white', borderColor: 'border-[#FF5A5F]' },
  { name: 'Brubank', shortName: 'Brubank', bgColor: 'bg-[#6B46C1]', textColor: 'text-white', borderColor: 'border-[#6B46C1]' },
  { name: 'Naranja X', shortName: 'Naranja', bgColor: 'bg-[#FF6B00]', textColor: 'text-white', borderColor: 'border-[#FF6B00]' },
  { name: 'Reba', shortName: 'Reba', bgColor: 'bg-[#00B4D8]', textColor: 'text-white', borderColor: 'border-[#00B4D8]' },
  { name: 'Lemon Cash', shortName: 'Lemon', bgColor: 'bg-[#FFDD00]', textColor: 'text-black', borderColor: 'border-[#FFDD00]' },
  { name: 'Personal Pay', shortName: 'Personal', bgColor: 'bg-[#00B2E3]', textColor: 'text-white', borderColor: 'border-[#00B2E3]' },
  { name: 'Prex', shortName: 'Prex', bgColor: 'bg-[#00C853]', textColor: 'text-white', borderColor: 'border-[#00C853]' },
];

// ============= COLOMBIA =============
const COLOMBIA_BANKS: BankConfig[] = [
  { name: 'Bancolombia', shortName: 'Bancolombia', bgColor: 'bg-[#FFD100]', textColor: 'text-black', borderColor: 'border-[#FFD100]' },
  { name: 'Banco de Bogotá', shortName: 'Bogotá', bgColor: 'bg-[#003399]', textColor: 'text-white', borderColor: 'border-[#003399]' },
  { name: 'Davivienda', shortName: 'Davivienda', bgColor: 'bg-[#ED1C24]', textColor: 'text-white', borderColor: 'border-[#ED1C24]' },
  { name: 'BBVA Colombia', shortName: 'BBVA', bgColor: 'bg-[#004481]', textColor: 'text-white', borderColor: 'border-[#004481]' },
  { name: 'Banco de Occidente', shortName: 'Occidente', bgColor: 'bg-[#003366]', textColor: 'text-white', borderColor: 'border-[#003366]' },
  { name: 'Banco Popular', shortName: 'Popular', bgColor: 'bg-[#1E3A5F]', textColor: 'text-white', borderColor: 'border-[#1E3A5F]' },
  { name: 'Banco AV Villas', shortName: 'AV Villas', bgColor: 'bg-[#E31837]', textColor: 'text-white', borderColor: 'border-[#E31837]' },
  { name: 'Banco Caja Social', shortName: 'Caja Social', bgColor: 'bg-[#00A651]', textColor: 'text-white', borderColor: 'border-[#00A651]' },
  { name: 'Scotiabank Colpatria', shortName: 'Colpatria', bgColor: 'bg-[#EC111A]', textColor: 'text-white', borderColor: 'border-[#EC111A]' },
  { name: 'Banco Itaú Colombia', shortName: 'Itaú', bgColor: 'bg-[#EC7000]', textColor: 'text-white', borderColor: 'border-[#EC7000]' },
  { name: 'Banco GNB Sudameris', shortName: 'GNB', bgColor: 'bg-[#003D7C]', textColor: 'text-white', borderColor: 'border-[#003D7C]' },
  { name: 'Banco Falabella', shortName: 'Falabella', bgColor: 'bg-[#8BC53F]', textColor: 'text-black', borderColor: 'border-[#8BC53F]' },
  { name: 'Banco Pichincha', shortName: 'Pichincha', bgColor: 'bg-[#FFD100]', textColor: 'text-black', borderColor: 'border-[#FFD100]' },
  { name: 'Banco Agrario', shortName: 'Agrario', bgColor: 'bg-[#00A651]', textColor: 'text-white', borderColor: 'border-[#00A651]' },
  { name: 'Nequi', shortName: 'Nequi', bgColor: 'bg-[#DA0081]', textColor: 'text-white', borderColor: 'border-[#DA0081]' },
  { name: 'Daviplata', shortName: 'Daviplata', bgColor: 'bg-[#ED1C24]', textColor: 'text-white', borderColor: 'border-[#ED1C24]' },
  { name: 'Rappipay', shortName: 'Rappi', bgColor: 'bg-[#FF4D00]', textColor: 'text-white', borderColor: 'border-[#FF4D00]' },
  { name: 'Nu Colombia', shortName: 'Nu', bgColor: 'bg-[#820AD1]', textColor: 'text-white', borderColor: 'border-[#820AD1]' },
  { name: 'Dale!', shortName: 'Dale', bgColor: 'bg-[#00B4D8]', textColor: 'text-white', borderColor: 'border-[#00B4D8]' },
  { name: 'MOVii', shortName: 'MOVii', bgColor: 'bg-[#FF6B35]', textColor: 'text-white', borderColor: 'border-[#FF6B35]' },
  { name: 'Banco W', shortName: 'Banco W', bgColor: 'bg-[#FFD100]', textColor: 'text-black', borderColor: 'border-[#FFD100]' },
  { name: 'Lulo Bank', shortName: 'Lulo', bgColor: 'bg-[#00E5A0]', textColor: 'text-black', borderColor: 'border-[#00E5A0]' },
];

// ============= CHILE =============
const CHILE_BANKS: BankConfig[] = [
  { name: 'Banco de Chile', shortName: 'Chile', bgColor: 'bg-[#003399]', textColor: 'text-white', borderColor: 'border-[#003399]' },
  { name: 'BancoEstado', shortName: 'Estado', bgColor: 'bg-[#00843D]', textColor: 'text-white', borderColor: 'border-[#00843D]' },
  { name: 'Santander Chile', shortName: 'Santander', bgColor: 'bg-[#EC0000]', textColor: 'text-white', borderColor: 'border-[#EC0000]' },
  { name: 'BCI', shortName: 'BCI', bgColor: 'bg-[#003B71]', textColor: 'text-white', borderColor: 'border-[#003B71]' },
  { name: 'Scotiabank Chile', shortName: 'Scotia', bgColor: 'bg-[#EC111A]', textColor: 'text-white', borderColor: 'border-[#EC111A]' },
  { name: 'Itaú Chile', shortName: 'Itaú', bgColor: 'bg-[#EC7000]', textColor: 'text-white', borderColor: 'border-[#EC7000]' },
  { name: 'Banco Security', shortName: 'Security', bgColor: 'bg-[#003366]', textColor: 'text-white', borderColor: 'border-[#003366]' },
  { name: 'Banco BICE', shortName: 'BICE', bgColor: 'bg-[#004481]', textColor: 'text-white', borderColor: 'border-[#004481]' },
  { name: 'Banco Falabella Chile', shortName: 'Falabella', bgColor: 'bg-[#8BC53F]', textColor: 'text-black', borderColor: 'border-[#8BC53F]' },
  { name: 'Banco Ripley', shortName: 'Ripley', bgColor: 'bg-[#7B2D8E]', textColor: 'text-white', borderColor: 'border-[#7B2D8E]' },
  { name: 'Banco Consorcio', shortName: 'Consorcio', bgColor: 'bg-[#003D7C]', textColor: 'text-white', borderColor: 'border-[#003D7C]' },
  { name: 'Banco Internacional', shortName: 'Internacional', bgColor: 'bg-[#1E4D8C]', textColor: 'text-white', borderColor: 'border-[#1E4D8C]' },
  { name: 'MACH', shortName: 'MACH', bgColor: 'bg-[#00E5FF]', textColor: 'text-black', borderColor: 'border-[#00E5FF]' },
  { name: 'Tenpo', shortName: 'Tenpo', bgColor: 'bg-[#00C853]', textColor: 'text-white', borderColor: 'border-[#00C853]' },
  { name: 'Mercado Pago Chile', shortName: 'MP', bgColor: 'bg-[#00BCFF]', textColor: 'text-white', borderColor: 'border-[#00BCFF]' },
  { name: 'Cuenta RUT', shortName: 'RUT', bgColor: 'bg-[#00843D]', textColor: 'text-white', borderColor: 'border-[#00843D]' },
  { name: 'Prepago Los Héroes', shortName: 'Héroes', bgColor: 'bg-[#C41E3A]', textColor: 'text-white', borderColor: 'border-[#C41E3A]' },
  { name: 'Fintual', shortName: 'Fintual', bgColor: 'bg-[#6366F1]', textColor: 'text-white', borderColor: 'border-[#6366F1]' },
  { name: 'Tapp Caja Los Andes', shortName: 'Tapp', bgColor: 'bg-[#00A4E4]', textColor: 'text-white', borderColor: 'border-[#00A4E4]' },
  { name: 'Global66', shortName: 'Global66', bgColor: 'bg-[#7C3AED]', textColor: 'text-white', borderColor: 'border-[#7C3AED]' },
];

// ============= PERU =============
const PERU_BANKS: BankConfig[] = [
  { name: 'BCP', shortName: 'BCP', bgColor: 'bg-[#003B71]', textColor: 'text-white', borderColor: 'border-[#003B71]' },
  { name: 'BBVA Perú', shortName: 'BBVA', bgColor: 'bg-[#004481]', textColor: 'text-white', borderColor: 'border-[#004481]' },
  { name: 'Interbank', shortName: 'Interbank', bgColor: 'bg-[#00A550]', textColor: 'text-white', borderColor: 'border-[#00A550]' },
  { name: 'Scotiabank Perú', shortName: 'Scotia', bgColor: 'bg-[#EC111A]', textColor: 'text-white', borderColor: 'border-[#EC111A]' },
  { name: 'Banco de la Nación', shortName: 'Nación', bgColor: 'bg-[#003399]', textColor: 'text-white', borderColor: 'border-[#003399]' },
  { name: 'BanBif', shortName: 'BanBif', bgColor: 'bg-[#00529B]', textColor: 'text-white', borderColor: 'border-[#00529B]' },
  { name: 'Banco Pichincha Perú', shortName: 'Pichincha', bgColor: 'bg-[#FFD100]', textColor: 'text-black', borderColor: 'border-[#FFD100]' },
  { name: 'Banco de Comercio', shortName: 'Comercio', bgColor: 'bg-[#003D7C]', textColor: 'text-white', borderColor: 'border-[#003D7C]' },
  { name: 'Banco GNB Perú', shortName: 'GNB', bgColor: 'bg-[#003D7C]', textColor: 'text-white', borderColor: 'border-[#003D7C]' },
  { name: 'Banco Falabella Perú', shortName: 'Falabella', bgColor: 'bg-[#8BC53F]', textColor: 'text-black', borderColor: 'border-[#8BC53F]' },
  { name: 'Banco Ripley Perú', shortName: 'Ripley', bgColor: 'bg-[#7B2D8E]', textColor: 'text-white', borderColor: 'border-[#7B2D8E]' },
  { name: 'Banco Azteca Perú', shortName: 'Azteca', bgColor: 'bg-[#00A651]', textColor: 'text-white', borderColor: 'border-[#00A651]' },
  { name: 'Caja Arequipa', shortName: 'Arequipa', bgColor: 'bg-[#C41E3A]', textColor: 'text-white', borderColor: 'border-[#C41E3A]' },
  { name: 'Caja Cusco', shortName: 'Cusco', bgColor: 'bg-[#8B4513]', textColor: 'text-white', borderColor: 'border-[#8B4513]' },
  { name: 'Caja Huancayo', shortName: 'Huancayo', bgColor: 'bg-[#006400]', textColor: 'text-white', borderColor: 'border-[#006400]' },
  { name: 'Yape', shortName: 'Yape', bgColor: 'bg-[#7B2D8E]', textColor: 'text-white', borderColor: 'border-[#7B2D8E]' },
  { name: 'Plin', shortName: 'Plin', bgColor: 'bg-[#00E5A0]', textColor: 'text-black', borderColor: 'border-[#00E5A0]' },
  { name: 'Tunki', shortName: 'Tunki', bgColor: 'bg-[#00A550]', textColor: 'text-white', borderColor: 'border-[#00A550]' },
  { name: 'Mercado Pago Perú', shortName: 'MP', bgColor: 'bg-[#00BCFF]', textColor: 'text-white', borderColor: 'border-[#00BCFF]' },
  { name: 'Rappi Perú', shortName: 'Rappi', bgColor: 'bg-[#FF4D00]', textColor: 'text-white', borderColor: 'border-[#FF4D00]' },
];

// ============= BRAZIL =============
const BRAZIL_BANKS: BankConfig[] = [
  { name: 'Banco do Brasil', shortName: 'BB', bgColor: 'bg-[#FFCC00]', textColor: 'text-black', borderColor: 'border-[#FFCC00]' },
  { name: 'Itaú Unibanco', shortName: 'Itaú', bgColor: 'bg-[#EC7000]', textColor: 'text-white', borderColor: 'border-[#EC7000]' },
  { name: 'Bradesco', shortName: 'Bradesco', bgColor: 'bg-[#CC092F]', textColor: 'text-white', borderColor: 'border-[#CC092F]' },
  { name: 'Caixa Econômica', shortName: 'Caixa', bgColor: 'bg-[#005CA9]', textColor: 'text-white', borderColor: 'border-[#005CA9]' },
  { name: 'Santander Brasil', shortName: 'Santander', bgColor: 'bg-[#EC0000]', textColor: 'text-white', borderColor: 'border-[#EC0000]' },
  { name: 'Nubank', shortName: 'Nubank', bgColor: 'bg-[#820AD1]', textColor: 'text-white', borderColor: 'border-[#820AD1]' },
  { name: 'Banco Inter', shortName: 'Inter', bgColor: 'bg-[#FF7A00]', textColor: 'text-white', borderColor: 'border-[#FF7A00]' },
  { name: 'C6 Bank', shortName: 'C6', bgColor: 'bg-[#1A1A1A]', textColor: 'text-white', borderColor: 'border-[#1A1A1A]' },
  { name: 'PicPay', shortName: 'PicPay', bgColor: 'bg-[#21C25E]', textColor: 'text-white', borderColor: 'border-[#21C25E]' },
  { name: 'PagBank', shortName: 'PagBank', bgColor: 'bg-[#00B8E0]', textColor: 'text-white', borderColor: 'border-[#00B8E0]' },
  { name: 'Next', shortName: 'Next', bgColor: 'bg-[#00E676]', textColor: 'text-black', borderColor: 'border-[#00E676]' },
  { name: 'Neon', shortName: 'Neon', bgColor: 'bg-[#00E5FF]', textColor: 'text-black', borderColor: 'border-[#00E5FF]' },
  { name: 'Original', shortName: 'Original', bgColor: 'bg-[#00A651]', textColor: 'text-white', borderColor: 'border-[#00A651]' },
  { name: 'BTG Pactual', shortName: 'BTG', bgColor: 'bg-[#003366]', textColor: 'text-white', borderColor: 'border-[#003366]' },
  { name: 'Banco Safra', shortName: 'Safra', bgColor: 'bg-[#003D7C]', textColor: 'text-white', borderColor: 'border-[#003D7C]' },
  { name: 'Banco Pan', shortName: 'Pan', bgColor: 'bg-[#00A3E0]', textColor: 'text-white', borderColor: 'border-[#00A3E0]' },
  { name: 'Banco BMG', shortName: 'BMG', bgColor: 'bg-[#FF6600]', textColor: 'text-white', borderColor: 'border-[#FF6600]' },
  { name: 'Banco Votorantim', shortName: 'BV', bgColor: 'bg-[#003399]', textColor: 'text-white', borderColor: 'border-[#003399]' },
  { name: 'Mercado Pago Brasil', shortName: 'MP', bgColor: 'bg-[#00BCFF]', textColor: 'text-white', borderColor: 'border-[#00BCFF]' },
  { name: 'Ame Digital', shortName: 'Ame', bgColor: 'bg-[#E31C79]', textColor: 'text-white', borderColor: 'border-[#E31C79]' },
  { name: 'RecargaPay', shortName: 'RecargaPay', bgColor: 'bg-[#00A651]', textColor: 'text-white', borderColor: 'border-[#00A651]' },
  { name: '99Pay', shortName: '99Pay', bgColor: 'bg-[#FF7700]', textColor: 'text-white', borderColor: 'border-[#FF7700]' },
];

// ============= COUNTRY CONFIGURATIONS =============
export const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    name: 'México',
    code: 'MX',
    flag: '🇲🇽',
    accountFormat: {
      name: 'CLABE',
      label: 'CLABE interbancaria',
      length: 18,
      placeholder: '000000000000000000',
    },
    banks: MEXICO_BANKS,
  },
  {
    name: 'Argentina',
    code: 'AR',
    flag: '🇦🇷',
    accountFormat: {
      name: 'CBU',
      label: 'CBU / CVU',
      length: 22,
      placeholder: '0000000000000000000000',
    },
    banks: ARGENTINA_BANKS,
  },
  {
    name: 'Colombia',
    code: 'CO',
    flag: '🇨🇴',
    accountFormat: {
      name: 'Cuenta',
      label: 'Número de cuenta',
      length: null,
      placeholder: 'Número de cuenta bancaria',
    },
    banks: COLOMBIA_BANKS,
  },
  {
    name: 'Chile',
    code: 'CL',
    flag: '🇨🇱',
    accountFormat: {
      name: 'Cuenta',
      label: 'Número de cuenta',
      length: null,
      placeholder: 'Número de cuenta bancaria',
    },
    banks: CHILE_BANKS,
  },
  {
    name: 'Perú',
    code: 'PE',
    flag: '🇵🇪',
    accountFormat: {
      name: 'CCI',
      label: 'CCI (Código Cuenta Interbancario)',
      length: 20,
      placeholder: '00000000000000000000',
    },
    banks: PERU_BANKS,
  },
  {
    name: 'Brasil',
    code: 'BR',
    flag: '🇧🇷',
    accountFormat: {
      name: 'Conta',
      label: 'Agência + Conta',
      length: null,
      placeholder: 'Agência e número da conta',
    },
    banks: BRAZIL_BANKS,
  },
];

// Build flat lookup map for all banks
const ALL_BANKS_MAP: Record<string, BankConfig> = {};
COUNTRY_CONFIGS.forEach(country => {
  country.banks.forEach(bank => {
    ALL_BANKS_MAP[bank.name] = bank;
  });
});

// Export legacy format for backwards compatibility
export const MEXICAN_BANKS: Record<string, BankConfig> = {};
MEXICO_BANKS.forEach(bank => {
  MEXICAN_BANKS[bank.name] = bank;
});

export const BANK_NAMES = MEXICO_BANKS.map(b => b.name);

// Get all bank names across all countries
export const ALL_BANK_NAMES = COUNTRY_CONFIGS.flatMap(c => c.banks.map(b => b.name));

// Get bank config by name (searches all countries)
export const getBankConfig = (bankName: string | null | undefined): BankConfig | null => {
  if (!bankName) return null;
  return ALL_BANKS_MAP[bankName] || null;
};

// Get country config by code
export const getCountryConfig = (countryCode: string): CountryConfig | undefined => {
  return COUNTRY_CONFIGS.find(c => c.code === countryCode);
};

// Default config for unknown banks
export const getDefaultBankConfig = (bankName: string): BankConfig => ({
  name: bankName,
  shortName: bankName.split(' ')[0].slice(0, 10),
  bgColor: 'bg-muted',
  textColor: 'text-foreground',
  borderColor: 'border-border',
});

// Get banks by country
export const getBanksByCountry = (countryCode: string): BankConfig[] => {
  const country = COUNTRY_CONFIGS.find(c => c.code === countryCode);
  return country?.banks || [];
};
