import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { base44 } from '@/api/base44Client';
import { pagesConfig } from '@/pages.config';
import { logAdminAction } from './adminLog';
import { loadAppSettings } from './appSettings';

export default function NavigationTracker() {
    const location = useLocation();
    const { user, isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    // Log user activity when navigating to a page
    useEffect(() => {
        // Extract page name from pathname
        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            // Remove leading slash and get the first segment
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];

            // Try case-insensitive lookup in Pages config
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );

            pageName = matchedKey || null;
        }

        if (isAuthenticated && pageName) {
            base44.appLogs.logUserInApp(pageName).catch(() => {
                // Silently fail - logging shouldn't break the app
            });
        }

        // F3: when the visitor is an admin, drop a row in admin_actions so we
        // have a full "who looked at what" trail. Gated by the
        // `log_admin_page_views` app setting so admins can disable the firehose.
        // Both `loadAppSettings` and `logAdminAction` swallow their own errors.
        if (isAuthenticated && pageName && user?.role === 'admin') {
            loadAppSettings()
                .then((settings) => {
                    if (!settings?.log_admin_page_views) return;
                    return logAdminAction(user, {
                        action: 'page_view',
                        target_type: 'page',
                        target_id: pageName,
                        target_label: `${pathname}${location.search ?? ''}`,
                    });
                })
                .catch(() => { /* logged inside helpers */ });
        }
    }, [location, isAuthenticated, Pages, mainPageKey, user]);

    return null;
}