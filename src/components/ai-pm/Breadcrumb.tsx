'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  ChevronRightIcon,
  FolderIcon,
  DocumentIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  projectName?: string;
  className?: string;
}

export default function Breadcrumb({ 
  items, 
  projectName,
  className = '' 
}: BreadcrumbProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumb items if not provided
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    if (items) return items;

    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbItems: BreadcrumbItem[] = [];

    // Home (AI PM Dashboard)
    breadcrumbItems.push({
      label: 'AI PM 대시보드',
      href: '/ai-pm',
      icon: HomeIcon
    });

    // Check if we're in AI PM routes
    if (pathSegments[0] === 'ai-pm' && pathSegments.length > 1) {
      const projectId = pathSegments[1];

      // Project page
      if (projectName) {
        breadcrumbItems.push({
          label: projectName,
          href: `/ai-pm/${projectId}`,
          icon: FolderIcon
        });
      } else {
        breadcrumbItems.push({
          label: '프로젝트',
          href: `/ai-pm/${projectId}`,
          icon: FolderIcon
        });
      }

      // Workflow page
      if (pathSegments[2] === 'workflow' && pathSegments[3]) {
        const step = pathSegments[3];
        const stepNumber = parseInt(step);
        
        breadcrumbItems.push({
          label: '워크플로우',
          href: `/ai-pm/${projectId}#workflow`
        });

        breadcrumbItems.push({
          label: `${stepNumber}단계`,
          href: `/ai-pm/${projectId}/workflow/${step}`,
          icon: DocumentIcon,
          isActive: true
        });
      }

      // Settings or other sub-pages can be added here
      if (pathSegments.includes('settings')) {
        breadcrumbItems.push({
          label: '설정',
          icon: CogIcon,
          isActive: true
        });
      }
    }

    return breadcrumbItems;
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-2" />
              )}
              
              <div className="flex items-center">
                {Icon && (
                  <Icon className="w-4 h-4 mr-2 text-gray-500" />
                )}
                
                {item.href && !isLast ? (
                  <Link 
                    href={item.href}
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span 
                    className={`${
                      isLast || item.isActive 
                        ? 'text-gray-900 font-medium' 
                        : 'text-gray-600'
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
} 