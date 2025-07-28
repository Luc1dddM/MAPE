# MAPE Development Guide

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Google AI API key

### Initial Setup
```bash
# Run the setup script
./setup.sh setup

# Add your Google AI API key to backend/.env
GEMINI_API_KEY=your_api_key_here
```

### Development
```bash
# Start development servers
./setup.sh dev

# Or manually:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### Production
```bash
# Build and start production
./setup.sh build
./setup.sh start

# Or with Docker
./setup.sh docker
```

## Architecture Overview

### Backend (Express.js)
```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── server.js        # Entry point
├── package.json
└── Dockerfile
```

### Frontend (Next.js)
```
frontend/
├── src/
│   ├── pages/           # Next.js pages
│   ├── components/      # React components
│   ├── services/        # API clients
│   ├── hooks/           # Custom hooks
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── styles/          # CSS styles
├── package.json
└── Dockerfile
```

## API Endpoints

### Prompt Generation
- `POST /api/prompts/generate` - Generate prompt variations
- `GET /api/prompts/techniques` - Get available techniques
- `POST /api/prompts/evaluate` - Evaluate prompt effectiveness
- `POST /api/prompts/test` - Test a prompt
- `POST /api/prompts/variations` - Generate variations
- `POST /api/prompts/optimize` - Optimize a prompt

### Request/Response Examples

#### Generate Prompts
```javascript
// Request
POST /api/prompts/generate
{
  "query": "Summarize a research paper",
  "context": "Academic context",
  "expectedOutput": "Clear, structured summary",
  "techniques": ["few-shot", "chain-of-thought"],
  "parameters": {
    "few-shot": { "numExamples": 3 }
  }
}

// Response
{
  "success": true,
  "data": {
    "results": {
      "few-shot": {
        "success": true,
        "prompt": "Generated prompt...",
        "technique": "few-shot",
        "description": "Few-shot learning prompt..."
      }
    },
    "summary": {
      "totalTechniques": 2,
      "successfulTechniques": 2,
      "failedTechniques": 0
    }
  }
}
```

## Prompt Engineering Techniques

### 1. Few-Shot Learning
- Provides examples to guide the model
- Parameters: `numExamples` (1-10, default: 3)
- Best for: Pattern recognition tasks

### 2. Chain of Thought
- Encourages step-by-step reasoning
- Parameters: `reasoningSteps` (1-10, default: 3)
- Best for: Complex problem solving

### 3. Zero-Shot
- Direct instruction without examples
- Parameters: `tone` (professional, casual, etc.)
- Best for: Simple, clear tasks

### 4. Role-Based
- Assigns specific persona/role
- Parameters: `role` (expert, teacher, analyst)
- Best for: Domain-specific tasks

### 5. Template-Based
- Uses structured templates
- Parameters: `templateStructure` (structured, formal)
- Best for: Consistent output format

### 6. Iterative Refinement
- Self-improvement through iterations
- Parameters: `iterations` (1-5, default: 2)
- Best for: High-quality outputs

## Environment Variables

### Backend (.env)
```bash
NODE_ENV=development
PORT=3001
GEMINI_API_KEY=your_api_key
REDIS_HOST=localhost
REDIS_PORT=6379
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=MAPE
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Development Workflow

### Adding New Techniques
1. Add technique to `PromptEngineeringService.js`
2. Update technique types in `frontend/src/types/api.ts`
3. Add parameters handling in forms
4. Test the new technique

### Adding New API Endpoints
1. Define route in `backend/src/routes/`
2. Create controller method
3. Add validation middleware if needed
4. Update frontend API service
5. Add TypeScript types

### Testing
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests (if configured)
npm run test:e2e
```

## Deployment

### Docker Deployment
```bash
# Development
docker-compose up --build

# Production
docker-compose -f docker-compose.prod.yml up --build
```

### Manual Deployment
1. Set environment variables
2. Install dependencies: `npm ci --production`
3. Build frontend: `npm run build`
4. Start services: `npm start`

## Monitoring and Logging

### Backend Logs
- Error logs: `backend/logs/error.log`
- Combined logs: `backend/logs/combined.log`
- Console output in development

### Frontend
- Browser console for client-side errors
- Next.js build logs
- Network requests in browser dev tools

## Troubleshooting

### Common Issues

#### Backend won't start
- Check Google AI API key is set
- Verify port 3001 is available
- Check Node.js version (18+)

#### Frontend build fails
- Clear `.next` directory
- Delete `node_modules` and reinstall
- Check TypeScript errors

#### API requests failing
- Verify backend is running
- Check CORS configuration
- Verify API URLs match

#### Google AI API errors
- Check API key validity
- Verify rate limits
- Check request format

### Debug Mode
```bash
# Backend with debug
cd backend && DEBUG=* npm run dev

# Frontend with debug
cd frontend && DEBUG=* npm run dev
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-technique`
3. Make changes and test thoroughly
4. Update documentation
5. Submit pull request

## Performance Optimization

### Backend
- Use Redis for caching
- Implement request queuing for AI calls
- Add response compression
- Monitor memory usage

### Frontend
- Optimize bundle size
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Cache API responses

## Security Considerations

- API key protection
- Rate limiting
- Input validation
- CORS configuration
- Helmet.js for security headers
- Environment variable security
