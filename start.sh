#!/bin/bash
export PORT=3001
export NODE_ENV=production
exec ./node_modules/.bin/next start -p 3001
