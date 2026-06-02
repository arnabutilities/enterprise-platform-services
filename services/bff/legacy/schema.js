const crypto = require('crypto');
const { gql } = require('apollo-server-express');
const { GraphQLScalarType, Kind } = require('graphql');
const { createPkceSession, consumePkceSession, revokeRefreshToken } = require('./sessionStore');
const { generateCodeVerifier, generateCodeChallenge, validateCodeChallenge } = require('./pkce');
const { signAccessToken, signRefreshToken, refreshTokenPayload } = require('./token');

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT: {
        const value = Object.create(null);
        ast.fields.forEach((field) => {
          value[field.name.value] = parseLiteral(field.value);
        });
        return value;
      }
      case Kind.LIST:
        return ast.values.map(parseLiteral);
      default:
        return null;
    }
  },
});

function buildUser(email) {
  const name = email.split('@')[0];
  return {
    id: Buffer.from(email).toString('base64').slice(0, 12),
    email,
    name,
    picture: null,
    roles: ['user'],
  };
}

function buildMetrics(reportId) {
  const now = new Date().toISOString();
  return ['revenue', 'orders', 'conversion'].map((metric, index) => ({
    id: `${reportId}-${metric}-${Date.now()}-${index}`,
    timestamp: now,
    event: metric,
    value: Math.floor(Math.random() * (index === 0 ? 10000 : 1000)),
    metadata: {
      reportId,
      strategy: index === 0 ? 'growth' : 'engagement',
    },
  }));
}

const typeDefs = gql`
  scalar JSON

  type User {
    id: ID!
    email: String!
    name: String!
    picture: String
    roles: [String!]!
  }

  type AuthResponse {
    accessToken: String!
    refreshToken: String!
    user: User!
  }

  type Dashboard {
    id: ID!
    totalUsers: Int!
    activeUsers: Int!
    metrics: [Metrics!]!
    lastUpdated: String!
  }

  type Metrics {
    id: ID!
    timestamp: String!
    event: String!
    value: Float!
    metadata: JSON
  }

  input ExchangeCodeInput {
    sessionId: String!
    code: String!
    state: String!
    codeVerifier: String!
  }

  type Query {
    getDashboard: Dashboard!
    getMetrics(dateFrom: String!, dateTo: String!): [Metrics!]!
  }

  type Mutation {
    initiatePkceFlow(provider: String!, email: String!, codeVerifier: String): String!
    exchangeAuthorizationCode(input: ExchangeCodeInput!): AuthResponse!
    refreshAccessToken(refreshToken: String!): AuthResponse!
    logout(refreshToken: String!): Boolean!
  }
`;

const resolvers = {
  JSON: JSONScalar,

  Query: {
    getDashboard: (_, __, context) => {
      if (!context.user) {
        throw new Error('Unauthorized');
      }

      return {
        id: `dashboard-${context.user.id}`,
        totalUsers: 1234,
        activeUsers: 218,
        metrics: buildMetrics('dashboard'),
        lastUpdated: new Date().toISOString(),
      };
    },
    getMetrics: (_, { dateFrom, dateTo }, context) => {
      if (!context.user) {
        throw new Error('Unauthorized');
      }

      return [...buildMetrics('metric-a'), ...buildMetrics('metric-b')].filter(
        (item) => item.timestamp >= dateFrom && item.timestamp <= dateTo,
      );
    },
  },

  Mutation: {
    initiatePkceFlow: (_, { provider, email, codeVerifier }) => {
      const verifier = codeVerifier || generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(verifier);
      const state = crypto.randomUUID();
      const sessionId = createPkceSession({
        email,
        provider,
        codeChallenge,
        state,
      });

      return JSON.stringify({
        provider,
        sessionId,
        state,
        codeChallenge,
        codeVerifier: verifier,
      });
    },

    exchangeAuthorizationCode: (_, { input }) => {
      const { sessionId, state, codeVerifier } = input;
      const session = consumePkceSession(sessionId);
      if (!session || session.state !== state) {
        throw new Error('Invalid PKCE session or state');
      }
      if (!validateCodeChallenge(codeVerifier, session.codeChallenge)) {
        throw new Error('Invalid PKCE code verifier');
      }

      const user = buildUser(session.email);
      const accessToken = signAccessToken({ sub: user.id, email: user.email, roles: user.roles });
      const refreshToken = signRefreshToken({
        userId: user.id,
        email: user.email,
        roles: user.roles,
      });

      return {
        accessToken,
        refreshToken,
        user,
      };
    },

    refreshAccessToken: (_, { refreshToken }) => {
      const payload = refreshTokenPayload(refreshToken);
      if (!payload) {
        throw new Error('Invalid refresh token');
      }
      const user = buildUser(payload.email);
      const accessToken = signAccessToken({ sub: user.id, email: user.email, roles: user.roles });
      const nextRefreshToken = signRefreshToken({
        userId: user.id,
        email: user.email,
        roles: user.roles,
      });

      return {
        accessToken,
        refreshToken: nextRefreshToken,
        user,
      };
    },

    logout: (_, { refreshToken }) => {
      return revokeRefreshToken(refreshToken);
    },
  },
};

module.exports = {
  typeDefs,
  resolvers,
};
