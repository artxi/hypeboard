import { http, HttpResponse } from 'msw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as { username: string; password: string };

    if (body.username === 'existinguser') {
      return HttpResponse.json(
        { message: 'Username already exists' },
        { status: 409 }
      );
    }

    return HttpResponse.json({
      accessToken: 'mock.jwt.token',
      user: {
        username: body.username,
        boardSlugs: [],
      },
    });
  }),

  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { username: string; password: string };

    if (body.username === 'testuser' && body.password === 'password123') {
      return HttpResponse.json({
        accessToken: 'mock.jwt.token',
        user: {
          username: 'testuser',
          boardSlugs: ['test-board'],
        },
      });
    }

    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.get(`${API_URL}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      username: 'testuser',
      boardSlugs: ['test-board'],
    });
  }),

  // Board endpoints
  http.post(`${API_URL}/boards`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as { name: string; createdBy: string };

    return HttpResponse.json({
      board: {
        _id: 'board123',
        name: body.name,
        slug: 'test-board',
        createdBy: body.createdBy,
        admins: [body.createdBy],
        members: [body.createdBy],
        inviteCode: 'ABC123',
        settings: {},
      },
      inviteLink: `http://localhost:5173/invite/ABC123`,
    });
  }),

  http.get(`${API_URL}/boards/:slug`, ({ params }) => {
    const { slug } = params;

    return HttpResponse.json({
      name: 'Test Board',
      slug: slug,
      createdBy: 'testuser',
      settings: {},
      admins: ['testuser'],
      members: ['testuser'],
      pendingRequests: [
        {
          username: 'pendinguser',
          requestedAt: new Date().toISOString(),
          message: 'Please approve',
        },
      ],
      inviteCode: 'ABC123',
    });
  }),

  http.post(`${API_URL}/boards/:slug/request-access`, async ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      message: 'Access request submitted successfully',
      status: 'pending',
    });
  }),

  http.post(`${API_URL}/boards/:slug/approve-member`, async ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      message: 'Member approved successfully',
      members: ['testuser', 'newmember'],
    });
  }),

  http.post(`${API_URL}/boards/:slug/deny-request`, async ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      message: 'Access request denied',
    });
  }),
];
