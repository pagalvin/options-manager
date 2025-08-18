import React from 'react';

interface FinancialLinksProps {
  security: string;
  className?: string;
}

/**
 * FinancialLinks component provides quick access links to popular financial websites
 * for a given security symbol.
 */
export const FinancialLinks: React.FC<FinancialLinksProps> = ({ 
  security, 
  className = "" 
}) => {
  const baseLinkStyles = "text-xs text-gray-500 hover:underline";
  
  const links = [
    {
      url: `https://finance.yahoo.com/quote/${security}`,
      label: 'YF',
      title: 'Yahoo Finance'
    },
    {
      url: `https://www.marketwatch.com/investing/stock/${security}`,
      label: 'MW',
      title: 'MarketWatch'
    },
    {
      url: `https://www.barchart.com/stocks/quotes/${security}/overview`,
      label: 'BC',
      title: 'Barchart'
    },
    {
      url: `https://us.etrade.com/etx/mkt/quotes?symbol=${security}#/snapshot/${security}`,
      label: 'ET',
      title: 'E*TRADE'
    },
    {
      url: `/etrade?symbol=${security}`,
      // globe icon
      label: '🌐',
      title: 'Real-time data from E*TRADE'
    },
    {
      url: `/chart/${security}`,
      label: '📊',
      title: 'View Chart'
    }

  ];

  return (
    <span className={className}>
      {links.map((link, index) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseLinkStyles} ${index === 0 ? 'ml-2' : 'ml-1'}`}
          title={link.title}
        >
          ({link.label})
        </a>
      ))}
    </span>
  );
};
