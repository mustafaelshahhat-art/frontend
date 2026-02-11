import { Routes } from '@angular/router';

/**
 * Shared feature routes that are reused across role prefixes.
 * Each function returns a Routes array that can be spread into
 * a role's children, ensuring a single source of truth for
 * component imports and no route duplication.
 *
 * Usage:
 *   children: [
 *       ...matchRoutes(),
 *       ...teamRoutes(),
 *       ...notificationRoutes(),
 *       // role-specific routes...
 *   ]
 */

/** /matches, /matches/:id, /matches/:id/chat */
export function matchRoutes(): Routes {
    return [
        {
            path: 'matches',
            loadComponent: () => import('./matches/pages/matches-list/matches-list.component').then(m => m.MatchesListComponent),
            data: { breadcrumb: 'المباريات', icon: 'sports_soccer' }
        },
        {
            path: 'matches/:id',
            loadComponent: () => import('./matches/pages/match-detail/match-detail.component').then(m => m.MatchDetailComponent),
            data: { breadcrumb: 'تفاصيل المباراة' }
        },
        {
            path: 'matches/:id/chat',
            loadComponent: () => import('./matches/pages/match-chat/match-chat.component').then(m => m.MatchChatComponent),
            data: { breadcrumb: 'محادثة المباراة' }
        }
    ];
}

/** /teams/:id (detail only — list is role-specific) */
export function teamDetailRoute(): Routes {
    return [
        {
            path: 'teams/:id',
            loadComponent: () => import('./teams/pages/team-detail/team-detail.component').then(m => m.TeamDetailPageComponent),
            data: { breadcrumb: 'تفاصيل الفريق' }
        }
    ];
}

/** /teams (list) + /teams/:id (detail) */
export function teamRoutes(): Routes {
    return [
        {
            path: 'teams',
            loadComponent: () => import('./teams/pages/teams-list.component').then(m => m.TeamsListComponent),
            data: { breadcrumb: 'الفرق', icon: 'groups' }
        },
        ...teamDetailRoute()
    ];
}

/** /tournaments (list) + /tournaments/:id (detail) */
export function tournamentRoutes(): Routes {
    return [
        {
            path: 'tournaments',
            loadComponent: () => import('./tournaments/pages/tournaments-list/tournaments-list.component').then(m => m.TournamentsListComponent),
            data: { breadcrumb: 'البطولات', icon: 'emoji_events' }
        },
        {
            path: 'tournaments/:id',
            loadComponent: () => import('./tournaments/pages/tournament-detail/tournament-detail.component').then(m => m.TournamentDetailComponent),
            data: { breadcrumb: 'تفاصيل البطولة' }
        }
    ];
}

/** Full tournament management (list + new + edit + detail) — admin only */
export function tournamentManagementRoutes(): Routes {
    return [
        {
            path: 'tournaments',
            loadComponent: () => import('./tournaments/pages/tournaments-list/tournaments-list.component').then(m => m.TournamentsListComponent),
            data: { breadcrumb: 'البطولات', icon: 'emoji_events' }
        },
        {
            path: 'tournaments/new',
            loadComponent: () => import('./tournaments/pages/tournament-manage/tournament-manage.component').then(m => m.TournamentManageComponent),
            data: { breadcrumb: 'إنشاء بطولة' }
        },
        {
            path: 'tournaments/edit/:id',
            loadComponent: () => import('./tournaments/pages/tournament-manage/tournament-manage.component').then(m => m.TournamentManageComponent),
            data: { breadcrumb: 'تعديل بطولة' }
        },
        {
            path: 'tournaments/:id',
            loadComponent: () => import('./tournaments/pages/tournament-detail/tournament-detail.component').then(m => m.TournamentDetailComponent),
            data: { breadcrumb: 'تفاصيل البطولة' }
        }
    ];
}

/** /objections (list) + /objections/:id (detail) */
export function objectionRoutes(): Routes {
    return [
        {
            path: 'objections',
            loadComponent: () => import('./objections/pages/objections-list/objections-list.component').then(m => m.ObjectionsListComponent),
            data: { breadcrumb: 'الاعتراضات', icon: 'gavel' }
        },
        {
            path: 'objections/:id',
            loadComponent: () => import('./objections/pages/objection-detail/objection-detail.component').then(m => m.ObjectionDetailComponent),
            data: { breadcrumb: 'تفاصيل الاعتراض' }
        }
    ];
}

/** /notifications */
export function notificationRoutes(): Routes {
    return [
        {
            path: 'notifications',
            loadComponent: () => import('./notifications/pages/notifications/notifications.component').then(m => m.NotificationsComponent),
            data: { breadcrumb: 'الإشعارات', icon: 'notifications' }
        }
    ];
}

/** /profile */
export function profileRoutes(): Routes {
    return [
        {
            path: 'profile',
            loadComponent: () => import('./users/pages/profile/profile.component').then(m => m.ProfileComponent),
            data: { breadcrumb: 'الملف الشخصي', icon: 'person' }
        }
    ];
}
