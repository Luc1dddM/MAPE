# MAPE Project Structure

```
MAPE/
├── README.md                 # Main project documentation
├── DEVELOPMENT.md           # Development guide
├── docker-compose.yml       # Docker orchestration
├── setup.sh                # Setup and development script
├── .gitignore              # Git ignore rules
│
├── backend/                # Express.js API server
│   ├── src/
│   │   ├── controllers/
│   │   │   └── PromptController.js      # API request handlers
│   │   ├── services/
│   │   │   ├── GoogleAIService.js       # Google AI integration
│   │   │   └── PromptEngineeringService.js  # Core prompt logic
│   │   ├── routes/
│   │   │   └── promptRoutes.js          # API route definitions
│   │   ├── middleware/
│   │   │   ├── errorHandler.js          # Error handling
│   │   │   └── validation.js            # Input validation
│   │   ├── utils/
│   │   │   └── logger.js                # Logging utility
│   │   └── server.js                    # Server entry point
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
│
└── frontend/               # Next.js React application
    ├── src/
    │   ├── pages/
    │   │   ├── _app.tsx                 # App wrapper
    │   │   └── index.tsx                # Home page
    │   ├── components/
    │   │   ├── ui/
    │   │   │   ├── Button.tsx           # Reusable button
    │   │   │   └── index.tsx            # UI components
    │   │   ├── layout/
    │   │   │   └── Layout.tsx           # App layout
    │   │   └── forms/
    │   │       └── PromptGenerationForm.tsx  # Main form
    │   ├── services/
    │   │   └── api.ts                   # API client
    │   ├── types/
    │   │   └── api.ts                   # TypeScript types
    │   ├── hooks/
    │   │   └── index.ts                 # Custom React hooks
    │   ├── utils/
    │   │   └── index.ts                 # Utility functions
    │   └── styles/
    │       └── globals.css              # Global styles
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── .env.local.example
    └── Dockerfile
```

## Key Files Description

### Backend Core Files

**PromptEngineeringService.js** - The heart of the application that implements different prompt engineering techniques:
- Few-shot learning
- Chain of thought
- Zero-shot prompting
- Role-based prompting
- Template-based prompting
- Iterative refinement

**GoogleAIService.js** - Handles integration with Google's Generative AI API for:
- Content generation
- Multiple variations
- Prompt effectiveness evaluation

**PromptController.js** - API endpoints for:
- `/api/prompts/generate` - Generate prompts using various techniques
- `/api/prompts/techniques` - Get available techniques
- `/api/prompts/evaluate` - Evaluate prompt effectiveness
- `/api/prompts/test` - Test prompts with input
- `/api/prompts/variations` - Generate variations
- `/api/prompts/optimize` - Optimize existing prompts

### Frontend Core Files

**PromptGenerationForm.tsx** - Main user interface for:
- Query input
- Context specification
- Expected output definition
- Technique selection
- Parameter configuration

**index.tsx** - Home page that displays:
- Form for input
- Generated prompt results
- Success/error states
- Copy functionality

**api.ts** - API client with:
- Axios configuration
- Type-safe API calls
- Error handling
- Request/response interceptors

## Technology Stack

### Backend
- **Express.js** - Web framework
- **@google/generative-ai** - AI integration
- **Winston** - Logging
- **Joi** - Validation
- **Helmet** - Security
- **CORS** - Cross-origin requests
- **Rate limiting** - API protection

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Hook Form** - Form management
- **React Query** - Data fetching
- **React Hot Toast** - Notifications
- **Framer Motion** - Animations

### Development Tools
- **Docker** - Containerization
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing (configured)

## API Flow

1. **User Input** → Frontend form collects query, context, expected output
2. **Technique Selection** → User chooses prompt engineering techniques
3. **API Call** → Frontend sends request to backend
4. **Prompt Generation** → Backend uses AI service to generate prompts
5. **Response** → Multiple prompt variations returned
6. **Display** → Frontend shows results with copy functionality

## Scalability Features

- **Modular Architecture** - Easy to add new techniques
- **Type Safety** - Full TypeScript coverage
- **Error Handling** - Comprehensive error management
- **Caching** - Redis support for performance
- **Rate Limiting** - API protection
- **Docker Support** - Easy deployment
- **Logging** - Structured logging for monitoring

## Extension Points

- **New Techniques** - Add to PromptEngineeringService
- **Different AI Models** - Extend GoogleAIService
- **Additional APIs** - Add new routes and controllers
- **UI Components** - Extend component library
- **Data Persistence** - Add database integration
- **Authentication** - Add user management
