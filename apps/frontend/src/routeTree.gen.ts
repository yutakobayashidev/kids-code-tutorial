/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as LoginImport } from './routes/login'
import { Route as AdminImport } from './routes/admin'
import { Route as SessionCodeImport } from './routes/$sessionCode'
import { Route as IndexImport } from './routes/index'
import { Route as AdminIndexImport } from './routes/admin/index'
import { Route as AdminUsersImport } from './routes/admin/users'
import { Route as AdminTutorialsImport } from './routes/admin/tutorials'
import { Route as AdminTrainingImport } from './routes/admin/training'
import { Route as AdminSettingsImport } from './routes/admin/settings'
import { Route as AdminSessionsImport } from './routes/admin/sessions'

// Create/Update Routes

const LoginRoute = LoginImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const AdminRoute = AdminImport.update({
  id: '/admin',
  path: '/admin',
  getParentRoute: () => rootRoute,
} as any)

const SessionCodeRoute = SessionCodeImport.update({
  id: '/$sessionCode',
  path: '/$sessionCode',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const AdminIndexRoute = AdminIndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => AdminRoute,
} as any)

const AdminUsersRoute = AdminUsersImport.update({
  id: '/users',
  path: '/users',
  getParentRoute: () => AdminRoute,
} as any)

const AdminTutorialsRoute = AdminTutorialsImport.update({
  id: '/tutorials',
  path: '/tutorials',
  getParentRoute: () => AdminRoute,
} as any)

const AdminTrainingRoute = AdminTrainingImport.update({
  id: '/training',
  path: '/training',
  getParentRoute: () => AdminRoute,
} as any)

const AdminSettingsRoute = AdminSettingsImport.update({
  id: '/settings',
  path: '/settings',
  getParentRoute: () => AdminRoute,
} as any)

const AdminSessionsRoute = AdminSessionsImport.update({
  id: '/sessions',
  path: '/sessions',
  getParentRoute: () => AdminRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/$sessionCode': {
      id: '/$sessionCode'
      path: '/$sessionCode'
      fullPath: '/$sessionCode'
      preLoaderRoute: typeof SessionCodeImport
      parentRoute: typeof rootRoute
    }
    '/admin': {
      id: '/admin'
      path: '/admin'
      fullPath: '/admin'
      preLoaderRoute: typeof AdminImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/admin/sessions': {
      id: '/admin/sessions'
      path: '/sessions'
      fullPath: '/admin/sessions'
      preLoaderRoute: typeof AdminSessionsImport
      parentRoute: typeof AdminImport
    }
    '/admin/settings': {
      id: '/admin/settings'
      path: '/settings'
      fullPath: '/admin/settings'
      preLoaderRoute: typeof AdminSettingsImport
      parentRoute: typeof AdminImport
    }
    '/admin/training': {
      id: '/admin/training'
      path: '/training'
      fullPath: '/admin/training'
      preLoaderRoute: typeof AdminTrainingImport
      parentRoute: typeof AdminImport
    }
    '/admin/tutorials': {
      id: '/admin/tutorials'
      path: '/tutorials'
      fullPath: '/admin/tutorials'
      preLoaderRoute: typeof AdminTutorialsImport
      parentRoute: typeof AdminImport
    }
    '/admin/users': {
      id: '/admin/users'
      path: '/users'
      fullPath: '/admin/users'
      preLoaderRoute: typeof AdminUsersImport
      parentRoute: typeof AdminImport
    }
    '/admin/': {
      id: '/admin/'
      path: '/'
      fullPath: '/admin/'
      preLoaderRoute: typeof AdminIndexImport
      parentRoute: typeof AdminImport
    }
  }
}

// Create and export the route tree

interface AdminRouteChildren {
  AdminSessionsRoute: typeof AdminSessionsRoute
  AdminSettingsRoute: typeof AdminSettingsRoute
  AdminTrainingRoute: typeof AdminTrainingRoute
  AdminTutorialsRoute: typeof AdminTutorialsRoute
  AdminUsersRoute: typeof AdminUsersRoute
  AdminIndexRoute: typeof AdminIndexRoute
}

const AdminRouteChildren: AdminRouteChildren = {
  AdminSessionsRoute: AdminSessionsRoute,
  AdminSettingsRoute: AdminSettingsRoute,
  AdminTrainingRoute: AdminTrainingRoute,
  AdminTutorialsRoute: AdminTutorialsRoute,
  AdminUsersRoute: AdminUsersRoute,
  AdminIndexRoute: AdminIndexRoute,
}

const AdminRouteWithChildren = AdminRoute._addFileChildren(AdminRouteChildren)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/$sessionCode': typeof SessionCodeRoute
  '/admin': typeof AdminRouteWithChildren
  '/login': typeof LoginRoute
  '/admin/sessions': typeof AdminSessionsRoute
  '/admin/settings': typeof AdminSettingsRoute
  '/admin/training': typeof AdminTrainingRoute
  '/admin/tutorials': typeof AdminTutorialsRoute
  '/admin/users': typeof AdminUsersRoute
  '/admin/': typeof AdminIndexRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/$sessionCode': typeof SessionCodeRoute
  '/login': typeof LoginRoute
  '/admin/sessions': typeof AdminSessionsRoute
  '/admin/settings': typeof AdminSettingsRoute
  '/admin/training': typeof AdminTrainingRoute
  '/admin/tutorials': typeof AdminTutorialsRoute
  '/admin/users': typeof AdminUsersRoute
  '/admin': typeof AdminIndexRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/$sessionCode': typeof SessionCodeRoute
  '/admin': typeof AdminRouteWithChildren
  '/login': typeof LoginRoute
  '/admin/sessions': typeof AdminSessionsRoute
  '/admin/settings': typeof AdminSettingsRoute
  '/admin/training': typeof AdminTrainingRoute
  '/admin/tutorials': typeof AdminTutorialsRoute
  '/admin/users': typeof AdminUsersRoute
  '/admin/': typeof AdminIndexRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/$sessionCode'
    | '/admin'
    | '/login'
    | '/admin/sessions'
    | '/admin/settings'
    | '/admin/training'
    | '/admin/tutorials'
    | '/admin/users'
    | '/admin/'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/$sessionCode'
    | '/login'
    | '/admin/sessions'
    | '/admin/settings'
    | '/admin/training'
    | '/admin/tutorials'
    | '/admin/users'
    | '/admin'
  id:
    | '__root__'
    | '/'
    | '/$sessionCode'
    | '/admin'
    | '/login'
    | '/admin/sessions'
    | '/admin/settings'
    | '/admin/training'
    | '/admin/tutorials'
    | '/admin/users'
    | '/admin/'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  SessionCodeRoute: typeof SessionCodeRoute
  AdminRoute: typeof AdminRouteWithChildren
  LoginRoute: typeof LoginRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  SessionCodeRoute: SessionCodeRoute,
  AdminRoute: AdminRouteWithChildren,
  LoginRoute: LoginRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/$sessionCode",
        "/admin",
        "/login"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/$sessionCode": {
      "filePath": "$sessionCode.tsx"
    },
    "/admin": {
      "filePath": "admin.tsx",
      "children": [
        "/admin/sessions",
        "/admin/settings",
        "/admin/training",
        "/admin/tutorials",
        "/admin/users",
        "/admin/"
      ]
    },
    "/login": {
      "filePath": "login.tsx"
    },
    "/admin/sessions": {
      "filePath": "admin/sessions.tsx",
      "parent": "/admin"
    },
    "/admin/settings": {
      "filePath": "admin/settings.tsx",
      "parent": "/admin"
    },
    "/admin/training": {
      "filePath": "admin/training.tsx",
      "parent": "/admin"
    },
    "/admin/tutorials": {
      "filePath": "admin/tutorials.tsx",
      "parent": "/admin"
    },
    "/admin/users": {
      "filePath": "admin/users.tsx",
      "parent": "/admin"
    },
    "/admin/": {
      "filePath": "admin/index.tsx",
      "parent": "/admin"
    }
  }
}
ROUTE_MANIFEST_END */
