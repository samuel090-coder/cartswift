import { useEffect } from 'react';

interface Product {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  currency: string;
  images?: string[] | null;
  category: string;
}

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  structured_data?: object;
  products?: Product[];
}

const SEOHead = ({ 
  title = "CartSwift - Fast & Reliable Online Shopping",
  description = "Shop the latest products at CartSwift with fast delivery and amazing deals. Browse fashion, books, tools, vehicles and more with secure payments and exclusive discounts.",
  keywords = "online shopping, fashion, books, tools, vehicles, fast delivery, CartSwift, e-commerce, digital products, secure payments",
  canonical = "https://cartswift.lovable.app/",
  structured_data,
  products = []
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);
    
    // Update meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywords);

    // Add Open Graph meta tags for social sharing
    const ogTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: canonical },
      { property: 'og:site_name', content: 'CartSwift' },
      { property: 'og:image', content: 'https://cartswift.lovable.app/favicon.png' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ];

    ogTags.forEach(tag => {
      const selector = tag.property 
        ? `meta[property="${tag.property}"]` 
        : `meta[name="${tag.name}"]`;
      let metaTag = document.querySelector(selector);
      if (!metaTag) {
        metaTag = document.createElement('meta');
        if (tag.property) {
          metaTag.setAttribute('property', tag.property);
        } else if (tag.name) {
          metaTag.setAttribute('name', tag.name);
        }
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', tag.content);
    });
    
    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical);
    
    // Build comprehensive structured data
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "CartSwift",
      "url": "https://cartswift.lovable.app",
      "logo": "https://cartswift.lovable.app/favicon.png",
      "description": "Fast & Reliable Online Shopping - Fashion, Books, Tools, Vehicles and more",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service"
      }
    };

    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "CartSwift",
      "url": "https://cartswift.lovable.app",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://cartswift.lovable.app/?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };

    // Create product list schema if products exist
    const productListSchema = products.length > 0 ? {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "CartSwift Products",
      "description": "Browse our collection of fashion, books, tools, vehicles and more",
      "numberOfItems": products.length,
      "itemListElement": products.slice(0, 20).map((product, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "@id": `https://cartswift.lovable.app/product/${product.id}`,
          "name": product.title,
          "description": product.description || `${product.title} - Available at CartSwift`,
          "image": product.images?.[0] || "https://cartswift.lovable.app/favicon.png",
          "category": product.category,
          "offers": {
            "@type": "Offer",
            "price": product.price,
            "priceCurrency": product.currency,
            "availability": "https://schema.org/InStock",
            "seller": {
              "@type": "Organization",
              "name": "CartSwift"
            }
          }
        }
      }))
    } : null;

    // Combine all schemas
    const combinedSchema = [
      organizationSchema,
      websiteSchema,
      ...(structured_data ? [structured_data] : []),
      ...(productListSchema ? [productListSchema] : [])
    ];

    let structuredDataScript = document.querySelector('#structured-data') as HTMLScriptElement;
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script') as HTMLScriptElement;
      structuredDataScript.id = 'structured-data';
      structuredDataScript.type = 'application/ld+json';
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify(combinedSchema);

  }, [title, description, keywords, canonical, structured_data, products]);

  return null;
};

export default SEOHead;