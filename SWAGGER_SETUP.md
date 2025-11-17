# Swagger/OpenAPI Documentation Setup

## Overview

Your Fitness Tracker Sync Server now has **complete OpenAPI 3.0 documentation** with an interactive Swagger UI interface. This is the Node.js equivalent of C# Swagger (like Swashbuckle in ASP.NET Core).

## What Was Added

### Packages Installed
- **swagger-jsdoc** - Converts JSDoc comments to OpenAPI 3.0 spec
- **swagger-ui-express** - Serves interactive Swagger UI interface

### Files Created/Modified

1. **[server/src/config/swagger.ts](server/src/config/swagger.ts)** (NEW)
   - OpenAPI 3.0 specification configuration
   - Schema definitions for all data models
   - Server configuration and metadata

2. **[server/src/index.ts](server/src/index.ts)** (MODIFIED)
   - Added Swagger UI routes
   - Added health check endpoint documentation

3. **[server/src/routes/sync.routes.ts](server/src/routes/sync.routes.ts)** (MODIFIED)
   - Added JSDoc comments to all 7 API endpoints
   - Includes request/response examples and schemas
   - Tags for organizing endpoints

## Accessing Swagger UI

Open your browser and navigate to:
```
http://localhost:3000/api-docs
```

## Features

### Interactive API Documentation
- ✅ View all endpoints with descriptions
- ✅ See request/response schemas
- ✅ Try endpoints directly from the browser
- ✅ Copy request examples in multiple formats
- ✅ View example responses

### Endpoints Documented

#### Health
- `GET /health` - Server health check

#### Sync Operations
- `POST /sync` - Sync all data (templates, instances, logs)
- `GET /sync/{userId}` - Get user data
- `POST /sync/{userId}/templates` - Sync templates only
- `POST /sync/{userId}/instances` - Sync instances only
- `POST /sync/{userId}/logs` - Sync logs only
- `GET /sync/{userId}/status` - Get sync status
- `DELETE /sync/{userId}` - Delete user data

### Data Models Documented
- **WorkoutTemplate** - Template structure with all properties
- **WorkoutInstance** - Completed workout session
- **ExerciseLog** - Individual exercise records
- **SyncStatus** - Sync history and status
- **SyncRequest** - Full sync request payload
- **ApiResponse** - Standard API response format

## Swagger JSON Spec

Raw OpenAPI specification is available at:
```
http://localhost:3000/api-docs.json
```

This can be imported into:
- **Postman** - For advanced API testing
- **Insomnia** - Alternative REST client
- **VS Code REST Client** - Extension-based testing
- **API documentation generators** - For creating static docs
- **API testing frameworks** - For automated testing

## Try It Out

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. In Swagger UI
1. Open http://localhost:3000/api-docs
2. Click on any endpoint
3. Click "Try it out"
4. Fill in required parameters
5. Click "Execute"

### 3. Example with cURL
```bash
# Get user data
curl -X GET "http://localhost:3000/api/sync/550e8400-e29b-41d4-a716-446655440000"

# Sync templates
curl -X POST "http://localhost:3000/api/sync/550e8400-e29b-41d4-a716-446655440000/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "templates": [
      {
        "id": "template-1",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Upper Body",
        "difficulty": "intermediate"
      }
    ]
  }'
```

## How It Works

### JSDoc to Swagger Conversion

In your route files, comments like this:
```typescript
/**
 * @swagger
 * /sync/{userId}:
 *   get:
 *     tags:
 *       - Sync
 *     summary: Get user data
 *     description: Retrieves all synced workout data
 */
router.get('/sync/:userId', async (req, res) => {
  // implementation
});
```

Are automatically converted to OpenAPI 3.0 spec and served as:
- Interactive Swagger UI at `/api-docs`
- JSON specification at `/api-docs.json`
- YAML specification available on demand

## Comparison: C# Swashbuckle vs Node.js Swagger JSDocs

| Feature | C# Swashbuckle | Node.js Swagger JSDocs |
|---------|-----------------|---------------------|
| Installation | NuGet package | npm packages |
| Configuration | Program.cs | Code + JSDoc comments |
| XML Comments | `/// <summary>` | `/** @swagger ... */` |
| Auto-discovery | Yes, from attributes | Yes, from JSDoc |
| Swagger UI | Built-in | swagger-ui-express |
| OpenAPI Spec | Auto-generated | Auto-generated |
| Customization | Fluent API | YAML in comments |

## Example: Adding Documentation to a New Endpoint

```typescript
/**
 * @swagger
 * /api/my-endpoint/{id}:
 *   get:
 *     tags:
 *       - MyTag
 *     summary: Brief description
 *     description: Longer description of what this does
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The resource ID
 *     responses:
 *       '200':
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MySchema'
 *       '404':
 *         description: Not found
 */
router.get('/my-endpoint/:id', (req, res) => {
  // implementation
});
```

## Advanced Features

### Custom Schemas
Add reusable schemas in [server/src/config/swagger.ts](server/src/config/swagger.ts):
```typescript
const options = {
  definition: {
    // ...
    components: {
      schemas: {
        MyCustomType: {
          type: 'object',
          properties: {
            field1: { type: 'string' },
            field2: { type: 'number' }
          }
        }
      }
    }
  }
};
```

### Multiple Servers
Configure different servers (dev, staging, prod) in swagger.ts:
```typescript
servers: [
  { url: 'http://localhost:3000', description: 'Development' },
  { url: 'https://staging.example.com', description: 'Staging' },
  { url: 'https://api.example.com', description: 'Production' }
]
```

### Security Definitions
Add authentication schemes if needed:
```typescript
components: {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  }
}
```

## Integration with Tools

### Postman
1. Open Postman
2. Click "Import"
3. Paste: `http://localhost:3000/api-docs.json`
4. Collection is created with all endpoints!

### OpenAPI Generator
Generate client libraries in any language:
```bash
# Generate JavaScript client
openapi-generator-cli generate \
  -i http://localhost:3000/api-docs.json \
  -g javascript \
  -o generated-client
```

### API Documentation Site
Generate static documentation:
```bash
# Using ReDoc
docker run -p 8080:80 \
  -e SPEC_URL=http://host.docker.internal:3000/api-docs.json \
  redocly/redoc
```

Then visit http://localhost:8080

## Files to Review

1. **[server/src/config/swagger.ts](server/src/config/swagger.ts)** - OpenAPI configuration
2. **[server/src/routes/sync.routes.ts](server/src/routes/sync.routes.ts)** - Documented endpoints
3. **[server/src/index.ts](server/src/index.ts)** - Swagger UI setup

## Next Steps

1. ✅ View documentation at http://localhost:3000/api-docs
2. ✅ Try endpoints using "Try it out" feature
3. ✅ Export spec to Postman for testing
4. ✅ Share `/api-docs.json` with frontend team
5. ✅ Generate client SDK if needed

## Troubleshooting

### Swagger UI not loading
- Check if `/api-docs` route is accessible
- Verify `swagger-ui-express` is installed: `npm list swagger-ui-express`
- Check browser console for CORS errors

### Endpoints not showing in Swagger
- Ensure JSDoc comments have `@swagger` tag
- Verify file is in `src/routes/*.ts` (configured in swagger.ts `apis` property)
- Rebuild TypeScript: `npm run build`
- Refresh browser

### Spec not updating after changes
- Clear browser cache
- Hard refresh: `Ctrl+Shift+R`
- Check `/api-docs.json` directly in browser

## Support

For more information:
- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express Documentation](https://github.com/scottie1984/swagger-ui-express)

---

**Version**: 1.0.0
**Created**: November 17, 2025
**Status**: Complete ✅
