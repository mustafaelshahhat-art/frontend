import { UserRole } from '../models/user.model';

export enum Permission {
    // Users
    VIEW_USERS = 'VIEW_USERS',
    MANAGE_USERS = 'MANAGE_USERS', // Edit, Delete, Suspend

    // Tournaments
    VIEW_TOURNAMENTS = 'VIEW_TOURNAMENTS',
    MANAGE_TOURNAMENTS = 'MANAGE_TOURNAMENTS', // Create, Edit, Delete
    REGISTER_TOURNAMENT = 'REGISTER_TOURNAMENT',

    // Matches
    VIEW_MATCHES = 'VIEW_MATCHES',
    MANAGE_MATCHES = 'MANAGE_MATCHES', // Schedule, Edit
    START_MATCH = 'START_MATCH',
    END_MATCH = 'END_MATCH',
    MANAGE_MATCH_EVENTS = 'MANAGE_MATCH_EVENTS', // Goals, Cards

    // Teams
    VIEW_TEAMS = 'VIEW_TEAMS',
    MANAGE_TEAMS = 'MANAGE_TEAMS', // Admin level management
    MANAGE_MY_TEAM = 'MANAGE_MY_TEAM', // Captain level

    // Objections
    VIEW_OBJECTIONS = 'VIEW_OBJECTIONS',
    MANAGE_OBJECTIONS = 'MANAGE_OBJECTIONS',
    CREATE_OBJECTION = 'CREATE_OBJECTION',

    // Financials
    VIEW_PAYMENTS = 'VIEW_PAYMENTS',
    MANAGE_PAYMENTS = 'MANAGE_PAYMENTS',

    // System
    VIEW_LOGS = 'VIEW_LOGS',
    MANAGE_SETTINGS = 'MANAGE_SETTINGS',
    VIEW_ADMIN_DASHBOARD = 'VIEW_ADMIN_DASHBOARD'
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
        Permission.VIEW_USERS, Permission.MANAGE_USERS,
        Permission.VIEW_TOURNAMENTS, Permission.MANAGE_TOURNAMENTS,
        Permission.VIEW_MATCHES, Permission.MANAGE_MATCHES,
        Permission.VIEW_TEAMS, Permission.MANAGE_TEAMS,
        Permission.VIEW_OBJECTIONS, Permission.MANAGE_OBJECTIONS,
        Permission.VIEW_PAYMENTS, Permission.MANAGE_PAYMENTS,
        Permission.VIEW_LOGS, Permission.MANAGE_SETTINGS,
        Permission.VIEW_ADMIN_DASHBOARD
    ],
    [UserRole.REFEREE]: [
        Permission.VIEW_TOURNAMENTS,
        Permission.VIEW_MATCHES, Permission.START_MATCH, Permission.END_MATCH, Permission.MANAGE_MATCH_EVENTS,
        Permission.VIEW_TEAMS
    ],
    [UserRole.PLAYER]: [
        Permission.VIEW_TOURNAMENTS, Permission.REGISTER_TOURNAMENT,
        Permission.VIEW_MATCHES,
        Permission.VIEW_TEAMS, Permission.MANAGE_MY_TEAM,
        Permission.VIEW_OBJECTIONS, Permission.CREATE_OBJECTION
    ],
    [UserRole.TOURNAMENT_CREATOR]: [
        Permission.VIEW_TOURNAMENTS, Permission.MANAGE_TOURNAMENTS,
        Permission.VIEW_MATCHES, Permission.MANAGE_MATCHES, Permission.MANAGE_MATCH_EVENTS,
        Permission.VIEW_TEAMS,
        Permission.VIEW_OBJECTIONS, Permission.MANAGE_OBJECTIONS,
        Permission.VIEW_PAYMENTS, Permission.MANAGE_PAYMENTS
    ]
};
