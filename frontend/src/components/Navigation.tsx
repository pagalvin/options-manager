import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Transactions', href: '/transactions' },
  { name: 'Transaction Analysis', href: '/transaction-analysis' },
  { name: 'Positions', href: '/positions' },
  { name: 'Options', href: '/options' },
  { name: 'Performance', href: '/performance' },
  { name: 'Options Analyzer', href: '/analyzer' },
  { name: 'Admin', href: '/admin' },
];

export function Navigation() {
  const location = useLocation();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Options Trading ROI Tracker
              </h1>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
