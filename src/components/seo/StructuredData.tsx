import { Helmet } from 'react-helmet-async';

// Base types for structured data
interface BaseStructuredData {
  '@context': 'https://schema.org';
  '@type': string;
}

// Organization Schema
export interface OrganizationSchema extends BaseStructuredData {
  '@type': 'Organization';
  name: string;
  url?: string;
  logo?: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: {
    '@type': 'PostalAddress';
    addressLocality?: string;
    addressCountry?: string;
  };
  sameAs?: string[];
}

// Event Schema (for raffles)
export interface EventSchema extends BaseStructuredData {
  '@type': 'Event';
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled';
  eventAttendanceMode?: 'OnlineEventAttendanceMode' | 'OfflineEventAttendanceMode' | 'MixedEventAttendanceMode';
  location?: {
    '@type': 'VirtualLocation';
    url: string;
  };
  image?: string[];
  organizer?: {
    '@type': 'Organization';
    name: string;
    url?: string;
  };
  offers?: {
    '@type': 'Offer';
    price: string | number;
    priceCurrency: string;
    availability?: 'InStock' | 'SoldOut' | 'PreOrder';
    validFrom?: string;
    url?: string;
  };
}

// SoftwareApplication Schema
export interface SoftwareApplicationSchema extends BaseStructuredData {
  '@type': 'SoftwareApplication';
  name: string;
  applicationCategory: string;
  operatingSystem?: string;
  description?: string;
  offers?: {
    '@type': 'Offer';
    price: string | number;
    priceCurrency: string;
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: string | number;
    reviewCount: string | number;
    bestRating?: string | number;
    worstRating?: string | number;
  };
  featureList?: string[];
}

// Product Schema (for pricing)
export interface ProductSchema extends BaseStructuredData {
  '@type': 'Product';
  name: string;
  description?: string;
  brand?: {
    '@type': 'Brand';
    name: string;
  };
  offers?: {
    '@type': 'AggregateOffer';
    lowPrice: string | number;
    highPrice: string | number;
    priceCurrency: string;
    offerCount?: number;
  } | Array<{
    '@type': 'Offer';
    name: string;
    price: string | number;
    priceCurrency: string;
    description?: string;
  }>;
}

// FAQ Schema
export interface FAQSchema extends BaseStructuredData {
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

// BreadcrumbList Schema
export interface BreadcrumbSchema extends BaseStructuredData {
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}

// WebSite Schema (for sitelinks search box)
export interface WebSiteSchema extends BaseStructuredData {
  '@type': 'WebSite';
  name: string;
  url: string;
  potentialAction?: {
    '@type': 'SearchAction';
    target: {
      '@type': 'EntryPoint';
      urlTemplate: string;
    };
    'query-input': string;
  };
}

type StructuredDataType = 
  | OrganizationSchema 
  | EventSchema 
  | SoftwareApplicationSchema 
  | ProductSchema 
  | FAQSchema 
  | BreadcrumbSchema
  | WebSiteSchema;

interface StructuredDataProps {
  data: StructuredDataType | StructuredDataType[];
}

export function StructuredData({ data }: StructuredDataProps) {
  const jsonLd = Array.isArray(data) ? data : [data];
  
  return (
    <Helmet>
      {jsonLd.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify({ '@context': 'https://schema.org', ...item })}
        </script>
      ))}
    </Helmet>
  );
}

// Helper functions to create structured data

export function createSoftwareApplicationSchema(overrides?: Partial<Omit<SoftwareApplicationSchema, '@context' | '@type'>>): SoftwareApplicationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Sortavo',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Plataforma profesional para crear y gestionar sorteos y rifas online. Vende boletos, acepta pagos y realiza sorteos transparentes.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'MXN',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '1250',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'Venta de boletos online',
      'Múltiples métodos de pago',
      'Sorteos en vivo',
      'Páginas personalizables',
      'Gestión de compradores',
      'Estadísticas en tiempo real',
    ],
    ...overrides,
  };
}

export function createEventSchema(
  raffle: {
    title: string;
    description?: string;
    drawDate?: string;
    ticketPrice: number;
    currencyCode?: string;
    prizeImages?: string[];
    slug: string;
    status?: string;
  },
  organization: {
    name: string;
    slug?: string;
  },
  url: string
): EventSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: raffle.title,
    description: raffle.description || `Sorteo de ${raffle.title}`,
    startDate: raffle.drawDate,
    eventStatus: raffle.status === 'completed' ? 'EventCancelled' : 'EventScheduled',
    eventAttendanceMode: 'OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url,
    },
    image: raffle.prizeImages || [],
    organizer: {
      '@type': 'Organization',
      name: organization.name,
      url: organization.slug ? `https://sortavo.com/${organization.slug}` : undefined,
    },
    offers: {
      '@type': 'Offer',
      price: raffle.ticketPrice.toString(),
      priceCurrency: raffle.currencyCode || 'MXN',
      availability: raffle.status === 'active' ? 'InStock' : 'SoldOut',
      url,
    },
  };
}

export function createOrganizationSchema(
  org: {
    name: string;
    slug?: string;
    description?: string;
    logoUrl?: string;
    email?: string;
    phone?: string;
    city?: string;
    countryCode?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    tiktokUrl?: string;
    websiteUrl?: string;
  }
): OrganizationSchema {
  const sameAs = [
    org.facebookUrl,
    org.instagramUrl,
    org.tiktokUrl,
    org.websiteUrl,
  ].filter(Boolean) as string[];

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: org.slug ? `https://sortavo.com/${org.slug}` : undefined,
    logo: org.logoUrl,
    description: org.description,
    email: org.email,
    telephone: org.phone,
    address: org.city || org.countryCode ? {
      '@type': 'PostalAddress',
      addressLocality: org.city || undefined,
      addressCountry: org.countryCode || undefined,
    } : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

export function createFAQSchema(
  faqs: Array<{ question: string; answer: string }>
): FAQSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function createBreadcrumbSchema(
  items: Array<{ name: string; url?: string }>
): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function createWebSiteSchema(): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sortavo',
    url: 'https://sortavo.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://sortavo.com/buscar?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export default StructuredData;
