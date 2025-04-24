FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /server

COPY package*.json pnpm-lock.yaml ./

# Configure pnpm with better registry settings
RUN pnpm config set registry https://registry.npmjs.org
RUN pnpm config set fetch-retries 5
RUN pnpm config set fetch-retry-mintimeout 20000
RUN pnpm config set fetch-retry-maxtimeout 60000
RUN pnpm config set network-concurrency 1
RUN pnpm config set public-hoist-pattern="*"

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE ${SERVER_PORT}

CMD ["pnpm", "run", "start:prod"]