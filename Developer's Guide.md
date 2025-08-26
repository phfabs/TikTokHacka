# 🚀 YiZ Planner - Complete Developer Guide



*Last Updated: July 26th 2025*

## 🎨 Latest UI/UX Enhancements (July 2025)

### 🌟 SkillShare Social Platform - Revolutionary Community Feature
- **Complete Social Ecosystem**: Full-featured social platform for sharing and discovering skills
- **Community Skill Sharing**: Users can share their 30-day skill plans with the community
- **Enhanced Skill Discovery**: Browse, search, and filter shared skills with advanced algorithms
- **Social Interactions**: Like, comment, rate, and download community-shared skills
- **Custom Task Contributions**: Community members can add custom tasks to improve shared skills
- **Trending & Categories**: Discover popular skills and browse by categories
- **User Profiles**: Social profiles showing contributions, shared skills, and activity
- **Real-time Feed**: Dynamic social feed with following, discover, and trending tabs
- **Professional UI**: Modern, Instagram-inspired interface with smooth animations

### ✨ Stats Screen - World-Class Analytics Dashboard
- **Comprehensive Analytics**: Real-time progress tracking with skills, habits, and activity metrics
- **Professional Visualizations**: Line charts, bar charts, progress rings, and activity heatmaps
- **Auto-Refresh System**: Fetches fresh data every time screen gains focus using `useFocusEffect`
- **Smooth Animations**: Spring animations for cards, number counting, and chart transitions
- **Guaranteed Scrollability**: Proper scroll configuration with bounce effects and pull-to-refresh
- **Whole Number Display**: All values rounded up using `Math.ceil()` for clean presentation
- **Error Handling**: Robust error states with retry functionality and loading indicators
- **Dark Theme Integration**: Consistent slate color palette with gradient backgrounds
- **Chart Components**: Custom reusable components built on `react-native-chart-kit`
- **Backend Analytics**: Comprehensive `StatsService` with repository pattern and performance optimization

### ✨ Skill Detail Screen Redesign
- **Modern Image Refresh**: Three-dot menu with refresh background image functionality
- **Enhanced Categorization**: Skill-relevant background images with 10+ categories
- **Today's Focus Redesign**: Sleek gradient cards with improved aesthetics
- **Progressive Completion**: Sequential day completion with proper validation
- **Layout Optimization**: Fixed empty white space and alignment issues

### ✨ Navigation & Habit System Overhaul
- **Redesigned Navigation Bar**: Improved tab layout with proper spacing and positioning fixes
- **Login Streak Tracking**: Real daily login streak calculation with AsyncStorage persistence
- **Compact Habit Cards**: Modern grid layout for efficient space utilization across screens
- **State Persistence**: Fixed habit check-in persistence with proper backend synchronization
- **Consistent Design**: Unified visual patterns across Repository and MyHabits screens



---



## 📋 Table of Contents



- [🎯 Project Overview](#-project-overview)

- [🛠️ Tech Stack](#️-tech-stack)

- [🏗️ Architecture Overview](#️-architecture-overview)

- [📁 Codebase Structure](#-codebase-structure)

- [🔧 Backend Deep Dive](#-backend-deep-dive)

- [📱 Frontend Deep Dive](#-frontend-deep-dive)

- [🔌 API Documentation](#-api-documentation)

- [🗄️ Database Schema](#️-database-schema)

- [⚙️ Setup & Installation](#️-setup--installation)

- [🔄 Development Workflow](#-development-workflow)

- [✨ Key Features Implementation](#-key-features-implementation)

- [🚀 Deployment Guide](#-deployment-guide)

- [🔧 Troubleshooting](#-troubleshooting)

- [🔮 Future Improvements](#-future-improvements)



---



## 🎯 Project Overview



**YiZ Planner** is a revolutionary cross-platform application that transforms skill acquisition through AI-powered 30-day learning plans and community-driven learning. It combines cutting-edge mobile development with artificial intelligence and social features to deliver personalized, structured learning experiences enhanced by community collaboration.

### 🔥 Current Status (July 2025)
- ✅ **Fully Functional**: All core features working reliably
- ✅ **Smart AI System**: Plan generation with caching and fallbacks  
- ✅ **Zero Failures**: Plan generation never fails thanks to local templates
- ✅ **Fast Performance**: <3 second response times for all operations
- ✅ **Stable Backend**: All async/sync issues resolved, 500 errors eliminated
- ✅ **Clean Frontend**: No build warnings, full SDK 53 compatibility
- ✅ **SkillShare Platform**: Complete social ecosystem with 23+ API endpoints
- ✅ **Community Features**: Skill sharing, discovery, interactions, and collaboration



### ✨ Core Functionality



| Feature | Description |

|---------|-------------|

| 🔐 **Secure Authentication** | JWT-based auth with 7-day expiry & auto-refresh |

| 🤖 **AI Plan Generation** | Personalized 30-day learning plans via OpenRouter AI |

| 📊 **Plan Management** | View, track, and manage daily learning tasks |

| 🌟 **SkillShare Social Platform** | Community skill sharing, discovery, and social interactions |

| 💬 **Social Features** | Like, comment, rate, and download community skills |

| 🔍 **Advanced Discovery** | Search, filter, trending, and category-based skill browsing |

| 📱 **Cross-Platform** | iOS, Android (Expo Go), and Web (Vercel) support |



### 🎯 Target Audience



- **Students** seeking structured learning paths and community learning

- **Professionals** wanting to upskill systematically with peer collaboration

- **Self-learners** desiring AI-guided skill development and social interaction

- **Communities** looking to share knowledge and learn together

- **Content Creators** wanting to share their expertise and build reputation

- **Anyone** looking to master new skills with structure and social support



---



## 🛠️ Tech Stack



### 📱 Frontend (Mobile & Web)

```

Framework │ React Native + Expo SDK 53

Language │ JavaScript (JSX) with TypeScript support

Navigation │ React Navigation (Custom Bottom Tab + Stack)

State │ React Context + AsyncStorage

HTTP Client │ Axios

Icons │ Lucide React Native + @expo/vector-icons

Build/Host │ Vercel (web), Expo Go/EAS (mobile)

Additional │ expo-blur, expo-linear-gradient, react-native-svg

```



### 🖥️ Backend (API Server)

```

Framework │ Python 3.11 + Flask

Database  │ MongoDB Atlas/Local with PyMongo

Authentication│ PyJWT 2.10 + bcrypt 4.3

CORS │ Flask-CORS

Config │ python-dotenv (local) / Render env-vars

Server │ Gunicorn with app factory pattern

Image Fetch │ Unsplash API via aiohttp

```



### 🤖 AI Services

```

Provider │ OpenRouter API

Model │ DeepSeek-R1 (free tier)

Purpose │ Generate structured 30-day learning plans

Features │ Smart caching, rate limiting, local fallbacks

Timeout │ 30 seconds (reduced from 60)

Fallback │ Local template system with categorization

```



### 🛠️ Development Tools

```

Version Control │ Git / GitHub

Package Mgmt │ npm + pip

Testing │ Jest, React-Testing-Library, Pytest

Code Quality │ ESLint, Prettier, Black, Flake8

```



---



## 🏗️ Architecture Overview



```mermaid

graph TB

A[React Native App] <-->|HTTPS/JSON| B[Flask API]

B <--> C[MongoDB Atlas]

B <--> D[OpenRouter AI]

B <--> E[Unsplash API]


subgraph "Frontend Screens"

A --> A1[RepositoryScreen]

A --> A2[SocialFeedScreen]

A --> A3[BrowseSkillsScreen]

A --> A4[SharedSkillDetailScreen]

A --> A5[StatsScreen]

A --> A6[ProfileScreen]

end


subgraph "Backend Services"

B --> B1[SkillService]

B --> B2[HabitService]

B --> B3[SocialService]

B --> B4[InteractionService]

B --> B5[CustomTaskService]

B --> B6[StatsService]

end


subgraph "Data Collections"

C --> C1[Users]

C --> C2[Skills]

C --> C3[Habits]

C --> C4[SharedSkills]

C --> C5[CustomTasks]

C --> C6[Interactions]

C --> C7[Comments]

C --> C8[HabitCheckins]

end

```



### 🔄 Data Flow Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as AuthContext
    participant B as Backend
    participant AI as OpenRouter AI
    participant DB as MongoDB
    participant S as SocialService

    Note over U,S: App Launch & Authentication
    U->>F: Open App
    F->>A: Load from AsyncStorage
    A->>B: POST /auth/verify
    B->>DB: Verify JWT
    DB->>B: User data
    B->>A: Valid user
    A->>F: Set authenticated state

    Note over U,S: Plan Generation
    U->>F: Create new skill
    F->>B: POST /generate-plan
    B->>AI: Generate 30-day plan
    AI->>B: Structured response
    B->>DB: Save skill with curriculum
    DB->>B: Skill created
    B->>F: Return skill data

    Note over U,S: Social Platform
    U->>F: Share skill with community
    F->>B: POST /api/v1/social/skills/share
    B->>S: SocialService.share_skill()
    S->>DB: Create shared_skill document
    DB->>S: Shared skill created
    S->>B: Return shared skill
    B->>F: Success response

    Note over U,S: Community Discovery
    U->>F: Browse skills
    F->>B: GET /api/v1/social/skills
    B->>S: SocialService.get_shared_skills()
    S->>DB: Query with filters/pagination
    DB->>S: Community skills
    S->>B: Enriched skills with user info
    B->>F: Skills feed
    F->>U: Display social feed

    Note over U,S: Social Interactions
    U->>F: Like/Comment/Download
    F->>B: POST /api/v1/social/skills/{id}/like
    B->>DB: Update interactions
    DB->>B: Interaction recorded
    B->>F: Updated engagement metrics
    F->>U: Real-time UI update
```

**Key Data Flow Stages**:
1. **App Launch**: AuthContext loads JWT from AsyncStorage → `/auth/verify`
2. **Authentication**: Backend verifies JWT signature & expiry → returns user
3. **Plan Generation**: `/generate-plan` → OpenRouter AI → structured response
4. **Skill/Habit Creation**: `/api/v1/plans/*` → Unsplash API → returns `image_url` / `icon_url`
5. **Social Discovery**: `/api/v1/social/skills` → SharedSkillRepository → community skills with interactions
6. **Skill Sharing**: `/api/v1/social/skills/share` → SocialService → creates shared skill in community
7. **Community Interactions**: Like/Comment/Rate → InteractionService → real-time social engagement
8. **Persistence**: JWT, user data, social interactions & media URLs stored for offline access



---



## 📁 Codebase Structure



### 📱 Frontend Structure

```

frontend/

├── 📄 App.js # Navigation root with auth switch

├── 📄 .env # Environment configuration

├── 📁 src/

│ ├── 📁 api/

│ │ ├── 📄 apiConfig.js # ENV-driven base URL config

│ │ ├── 📄 auth.js # Auth API helpers

│ │ └── 📄 plans.js # Skills & habits API with image refresh

│ ├── 📁 components/

│ │ ├── 📄 PlanCard.jsx # Reusable card for plans

│ │ └── 📁 charts/ # Stats dashboard visualization components

│ │ │ ├── 📄 StatCard.jsx # Animated metric cards with number counting

│ │ │ ├── 📄 StatsLineChart.jsx # Line chart for trend visualization

│ │ │ ├── 📄 StatsBarChart.jsx # Bar chart for comparison data

│ │ │ ├── 📄 ProgressRing.jsx # Circular progress indicators

│ │ │ └── 📄 ActivityHeatMap.jsx # Calendar-style activity visualization

│ ├── 📁 context/

│ │ └── 📄 AuthContext.js # JWT persistence & state

│ ├── 📁 navigation/

│ │ └── 📄 MainTabNavigator.jsx # Custom tab bar and main app navigation

│ ├── 📁 screens/

│ │ ├── 📄 LoginScreen.jsx # Login interface

│ │ ├── 📄 RegisterScreen.jsx # Registration interface

│ │ ├── 📄 RepositoryScreen.jsx # Main dashboard with compact grid habit cards

│ │ ├── 📄 MyHabitsScreen.jsx # Full habits view with 2-column grid layout

│ │ ├── 📄 ProfileScreen.jsx # Revamped user profile

│ │ ├── 📄 SocialFeedScreen.jsx # SkillShare social feed with following, discover, trending

│ │ ├── 📄 BrowseSkillsScreen.jsx # Advanced skill discovery with search and filters

│ │ ├── 📄 SharedSkillDetailScreen.jsx # Detailed view of community-shared skills

│ │ ├── 📄 CreateSharedSkillScreen.jsx # Interface for sharing skills with community

│ │ ├── 📄 ShareSkillScreen.jsx # Skill sharing workflow and options

│ │ ├── 📄 SearchScreen.jsx # Advanced search with filters and suggestions

│ │ ├── 📄 UnifiedProfileScreen.jsx # Enhanced social profile with contributions

│ │ ├── 📄 StatsScreen.jsx # World-class analytics dashboard with comprehensive visualizations

│ │ ├── 📄 AddSkillScreen.jsx # Form to create a new skill

│ │ └── 📄 AddHabitScreen.jsx # Form to create a new habit

│ └── 📁 constants/

│ └── 📄 colors.js # App color palette

└── 📁 assets/ # Static resources

```



### 🖥️ Backend Structure

```

backend/

├── 📄 app.py               # Flask app factory (Gunicorn entry)

├── 📄 config.py            # Centralized settings

├── 📄 requirements.txt     # Python dependencies

├── 📄 Procfile             # Render deployment entry

├── 📁 api/

│   └── 📁 v1/

│       └── 📄 plans.py     # Plan-related routes (REST)

├── 📁 auth/

│   ├── 📄 routes.py        # /auth/* endpoints

│   ├── 📄 models.py        # User schema & helpers

│   └── 📄 utils.py         # Password hashing & JWT helpers

├── 📁 models/

│   └── 📄 base.py          # Reusable DB helpers

├── 📁 schemas/

│   └── 📄 plan_schemas.py  # Marshmallow / validation schemas

├── 📁 repositories/

│   ├── 📄 habit_repository.py   # CRUD for habits

│   ├── 📄 skill_repository.py   # CRUD for skills

│   ├── 📄 checkin_repository.py # Habit check-ins

│   ├── 📄 shared_skill_repository.py # Community-shared skills

│   ├── 📄 custom_task_repository.py # User-contributed custom tasks

│   ├── 📄 interaction_repository.py # Social interactions (likes, ratings)

│   ├── 📄 comment_repository.py # Threaded comment system

│   └── 📄 skill_completion_repository.py # Skill completion tracking

└── 📁 services/

    ├── 📄 ai_service.py        # Smart AI plan generation with caching & fallbacks

    ├── 📄 habit_service.py     # Habit business logic

    ├── 📄 skill_service.py     # Skill business logic & image refresh

    ├── 📄 stats_service.py     # Comprehensive analytics engine for dashboard

    ├── 📄 social_service.py    # SkillShare social platform core functionality

    ├── 📄 custom_task_service.py # Custom task management and voting system

    ├── 📄 interaction_service.py # Social interactions (likes, comments, ratings)

    ├── 📄 search_service.py    # Advanced search and discovery algorithms

    └── 📄 unsplash_service.py  # Enhanced image categorization & skill-relevant photos

```



---



## 🔧 Backend Deep Dive



### 🏗️ App Factory Pattern (`app.py`)



```python

def create_app():

"""Flask application factory with CORS configuration"""

app = Flask(__name__)


# CORS origins for cross-platform support

origins = [

FRONTEND_URL,

"http://localhost:8081", # Expo dev server

"exp://192.168.0.116:8081" # Expo Go

]


CORS(app, origins=origins)


# Module-level export for Gunicorn

app = create_app() # → gunicorn backend.app:app

```



### 🔐 Authentication System



#### 🔑 Security Features

- **bcrypt** hashing (12 rounds default)

- **JWT** payload: `{user_id, iat, exp(+7d)}`

- **Unique indexes** on username & email

- **Auto-created indexes** on first insert



#### 📊 User Model Operations

```python

class User:

@staticmethod

def create(username, email, password_hash):

"""Create new user with automatic timestamps"""


@staticmethod

def find_by_username_or_email(identifier):

"""Flexible login identifier lookup"""


@staticmethod

def update_last_login(user_id):

"""Track user activity"""

```



### 🤖 Smart AI Plan Generation



```python

class AIService:

    # Cache for generated plans to avoid repeated API calls

    _plan_cache = {}

    _last_api_call = 0

    _api_cooldown = 60  # 1 minute cooldown between API calls

    

    @staticmethod

    async def generate_structured_plan(topic: str, plan_type: str = "skill"):

        """

        Generate a structured 30-day plan with smart fallbacks:

        1. Check cache first

        2. Try AI service if cooldown period passed

        3. Fall back to local template generation

        """

        

        # Check cache first

        cache_key = f"{topic.lower().strip()}_{plan_type}"

        if cache_key in AIService._plan_cache:

            return AIService._plan_cache[cache_key]

        

        # Check if we should try AI service (rate limiting)

        current_time = time.time()

        if current_time - AIService._last_api_call < AIService._api_cooldown:

            return AIService._generate_local_plan(topic, plan_type)

        

        # Try AI service with fallback to local generation

        try:

            plan = await AIService._generate_ai_plan(topic, plan_type)

            AIService._plan_cache[cache_key] = plan

            AIService._last_api_call = current_time

            return plan

        except Exception as e:

            # Fall back to local generation

            return AIService._generate_local_plan(topic, plan_type)

```



#### 🎯 Enhanced Plan Generation Features

- ✅ **Smart Caching**: Stores generated plans to avoid repeated API calls

- ✅ **Rate Limiting**: 60-second cooldown between API calls prevents 429 errors

- ✅ **Local Fallback**: Template-based generation when AI service is unavailable

- ✅ **Topic Categorization**: Automatically categorizes topics for appropriate templates

- ✅ **Fast Response**: Local generation is instantaneous, AI calls timeout after 30s

- ✅ **Never Fails**: Always returns a valid plan through multiple fallback mechanisms

- ✅ **Template Categories**: Programming, Language Learning, Fitness, Creative Arts

### 🖼️ Enhanced Image Management System

#### 🎨 UnsplashService with Smart Categorization

```python
class UnsplashService:
    @staticmethod
    def _categorize_skill(query: str) -> str:
        """Categorize skills for relevant image selection"""
        # Comprehensive categorization with priority order:
        # 1. Languages (Spanish, French, German, etc.)
        # 2. Cooking & Cuisine (Italian cuisine, French cooking, etc.)
        # 3. Creative Writing (before general design)
        # 4. Arts & Design (UI/UX, graphic design, etc.)
        # 5. Programming & Technology (Python, React, etc.)
        # 6. Business & Marketing
        # 7. Health & Fitness
        # 8. Science & Education
        
    @staticmethod
    async def fetch_image(query: str) -> str:
        """Return skill-relevant image with cache-busting"""
        # 1. Try Unsplash API with skill-specific query
        # 2. Fall back to categorized local image collection
        # 3. Add cache-busting parameters for refresh functionality
        
        category = UnsplashService._categorize_skill(query)
        images = SKILL_IMAGES.get(category, SKILL_IMAGES["default"])
        selected_image = random.choice(images)
        cache_buster = f"?refresh={random.randint(1000, 9999)}"
        return selected_image + cache_buster
```

#### 🔄 Skill Image Refresh Functionality

```python
# skill_service.py
def refresh_skill_image(skill_id: str, user_id: str) -> dict:
    """Refresh skill background image with new selection"""
    skill = skill_repository.get_skill_by_id(skill_id)
    
    if not skill or skill.get('user_id') != ObjectId(user_id):
        raise ValueError("Skill not found or access denied")
    
    # Generate new image URL
    new_image_url = await UnsplashService.fetch_image(skill['title'])
    
    # Update skill with new image
    skill_repository.update_skill(skill_id, {'image_url': new_image_url})
    
    return skill_repository.get_skill_by_id(skill_id)
```

#### 📷 Image Categories & Fallbacks

| Category | Skills Matched | Example Images |
|----------|---------------|----------------|
| **🔤 Languages** | Spanish, French, German, Learn Korean | Books, dictionaries, language learning |
| **🍳 Cooking** | Italian Cuisine, French Cooking, Baking | Kitchen scenes, food preparation |
| **✍️ Writing** | Creative Writing, Journalism, Blogging | Notebooks, typewriters, writing scenes |
| **🎨 Design** | UI/UX Design, Graphic Design, Photoshop | Design tools, creative workspaces |
| **📸 Photography** | Portrait Photography, Landscape, Editing | Cameras, photo equipment |
| **💻 Programming** | Python, React, Web Development | Code screens, development setups |
| **🏋️ Fitness** | Yoga, Gym Training, Running | Exercise equipment, fitness scenes |
| **🎵 Music** | Guitar, Piano, Music Theory | Musical instruments, music notation |
| **📈 Business** | Marketing, Strategy, Management | Office environments, business concepts |
| **🔬 Science** | Physics, Chemistry, Biology | Laboratory equipment, scientific imagery |

### 📊 Stats Service (Analytics Engine)

#### 🎯 StatsService Architecture

The `StatsService` provides comprehensive analytics for the stats dashboard, calculating real-time metrics across skills, habits, and user activity patterns.

```python
class StatsService:
    @staticmethod
    def get_user_stats(user_id: str, skill_repo: SkillRepository, 
                      habit_repo: HabitRepository, checkin_repo: CheckinRepository) -> Dict:
        """
        Generate comprehensive user statistics for the stats dashboard
        Returns: Complete analytics object with overview, skills, habits, and activity data
        """
        # Core calculation methods:
        # • _calculate_skills_stats() - Progress tracking and completion trends
        # • _calculate_habits_stats() - Streaks, consistency, and checkin patterns  
        # • _calculate_overall_stats() - Cross-platform metrics and totals
        # • _calculate_activity_timeline() - 30-day activity heatmap data
```

#### 📈 Key Analytics Features

**Skills Analytics**:
- **Progress Tracking**: Individual skill completion percentages and current day
- **Completion Trends**: 7-day trend analysis with daily completion counts
- **Status Breakdown**: Active vs completed skills with detailed metadata
- **Average Completion**: Overall progress across all skills (whole numbers)

**Habits Analytics**:
- **Streak Calculations**: Current and longest streaks for each habit
- **Consistency Score**: 30-day completion rate as percentage (0-100)
- **Weekly Patterns**: 7-day checkin history with day-of-week analysis
- **Category Breakdown**: Habit categorization with color coding

**Activity Timeline**:
- **30-Day Heatmap**: Daily activity intensity scoring (0-1 scale)
- **Combined Metrics**: Skill progress + habit checkins per day
- **Trend Analysis**: Activity patterns and engagement insights
- **Intensity Scoring**: Normalized activity levels for visualization

#### 🔢 Whole Number Implementation

All numerical values are returned as integers using `int()` conversion and `Math.ceil()` on the frontend:

```python
# Backend: Return whole numbers for percentages
"average_completion": int(average_completion) if average_completion > 0 else 0,
"consistency_score": int(consistency_score) if consistency_score > 0 else 0,

# Frontend: Round up all displayed values
const displayValue = Math.ceil(rawValue);
```

#### ⚡ Performance Optimizations

- **Repository Pattern**: Efficient data access with dedicated repository classes
- **Batch Processing**: Single database queries for multiple calculations
- **Smart Caching**: Stats generation optimized for real-time dashboard updates
- **Lazy Loading**: Calculate only requested metrics to reduce response time

---



## 📱 Frontend Deep Dive



### 🧭 Navigation Architecture

The app uses a custom-built, animated bottom tab navigator with integrated social features. The navigation includes dedicated stacks for social interactions and skill discovery.

```mermaid
graph TD
  subgraph "App Entry"
    A[App.js] -->|AuthProvider| B{RootNavigator}
  end

  B -->|Unauthenticated| C[AuthStack]
  B -->|Authenticated| D[MainTabNavigator]

  subgraph "Authentication"
    C --> E[LoginScreen]
    C --> F[RegisterScreen]
  end

  subgraph "Main Tabs"
    D --> G[RepositoryStack]
    D --> S[SocialStack]
    D --> L[StatsScreen]
    D --> M[ProfileScreen]
  end

  subgraph "Repository Stack"
    G --> H[RepositoryScreen]
    H --> I[AddSkillScreen]
    H --> J[AddHabitScreen]
    H --> N[AllSkillsScreen]
    H --> O[AllHabitsScreen]
    H --> P[SkillDetailScreen]
    P --> Q[DayDetailScreen]
  end

  subgraph "SkillShare Social Stack"
    S --> SF[SocialFeedScreen]
    S --> BS[BrowseSkillsScreen]
    SF --> SSD[SharedSkillDetailScreen]
    BS --> SSD
    SF --> CSS[CreateSharedSkillScreen]
    SF --> SSS[ShareSkillScreen]
    SF --> SEARCH[SearchScreen]
    SSD --> CSS
  end

  subgraph "Social Features"
    SSD --> COMMENTS[CommentsSection]
    SSD --> TASKS[CustomTasks]
    SF --> PROFILE[UserProfileScreen]
  end

  style D fill:#8B5CF6,stroke:#333,stroke-width:3px
  style S fill:#22C55E,stroke:#333,stroke-width:2px
  style SF fill:#3B82F6,stroke:#333,stroke-width:2px
```

### 🔐 Authentication Context



```javascript

// Global authentication state management

const AuthContext = createContext();



// Key functions:

// • login(user, token) - Store in AsyncStorage + update state

// • logout() - Clear AsyncStorage + reset state

// • Auto-verification on app launch

// • Loading state management

```



### ⚙️ API Configuration



```javascript

// Environment-specific API endpoints

export const API_BASE_URL =

process.env.EXPO_PUBLIC_API_BASE_URL || // Mobile & web

process.env.REACT_APP_API_BASE_URL || // Web fallback

"http://192.168.0.116:8080"; // Development default

```



> 💡 **Pro Tip**: Metro shows `env: export ...` when environment variables are loaded



### 🎨 Screen Components

#### ✨ `RepositoryScreen`
- **Purpose**: The main dashboard and landing screen after login.
- **Features**: Displays user's daily focus, active skills, and current habits in a visually engaging layout.
- **UI**: Uses circular progress bars for stats and custom cards for skills and habits.

#### ✨ `ProfileScreen`
- **Purpose**: A comprehensive view of the user's journey and settings.
- **Features**:
    - Displays user info, streak, and overall progress with a gradient card.
    - Showcases achievements and key statistics in a grid.
    - Provides access to settings like "Dark Mode" and "Notifications" with custom toggle switches.
    - Contains the "Log Out" functionality.

#### ✨ `StatsScreen` (World-Class Analytics Dashboard)
- **Purpose**: Comprehensive progress analytics dashboard with aesthetic visualizations matching major app standards.
- **Features**:
    - **Real-time Data Refresh**: Automatically fetches fresh data when screen gains focus using `useFocusEffect`
    - **Overview Cards**: Key metrics (skills, habits, consistency, activity) with animated number counting
    - **Visual Charts**: Line charts, bar charts, progress rings, and activity heatmaps
    - **Skills Analytics**: Detailed breakdown of skill progress, completion trends, and individual skill status
    - **Habits Analytics**: Habit streaks, consistency scores, and weekly completion patterns
    - **Activity Timeline**: 30-day activity heatmap showing engagement patterns
    - **Pull-to-Refresh**: Swipe down to manually refresh all statistics
    - **Error Handling**: Robust error states with retry functionality
    - **Loading States**: Smooth loading animations while data is being fetched
- **UI Design**:
    - Dark theme with slate color palette (#1e293b, #334155, #475569)
    - Gradient card backgrounds using `expo-linear-gradient`
    - Guaranteed scrollability with bounce effects (`alwaysBounceVertical`)
    - Whole number display - all decimals rounded up using `Math.ceil()`
    - Professional chart styling with transparent backgrounds
    - Smooth spring animations for card entrance effects
    - Responsive layout with proper spacing and typography
- **Technical Implementation**:
    - Uses `react-native-chart-kit` for chart visualizations
    - Custom chart components: `ProgressRing`, `StatsLineChart`, `StatsBarChart`, `ActivityHeatMap`, `StatCard`
    - Comprehensive stats API integration with JWT authentication
    - Optimized performance with React hooks and proper state management
    - Scroll view configuration ensuring content is always scrollable

#### ✨ `SkillDetailScreen` (Enhanced)
- **Purpose**: Complete skill learning experience with modern UI/UX design.
- **Features**:
    - **Header with Background Image**: Dynamic skill-relevant background with overlay gradient
    - **Three-dot Menu**: Refresh image, edit skill, delete skill options
    - **Progress Tracking**: Visual progress bar showing completion percentage
    - **Today's Focus Card**: Gradient-enhanced card with current day tasks
    - **Progressive Completion**: Users can only complete days sequentially
    - **All Days View**: Expandable section showing all 30 days with status indicators
    - **Completion Celebration**: Special design for completed skills
- **UI Design**:
    - Modern gradient backgrounds (`LinearGradient` from `#667eea` to `#764ba2`)
    - Proper spacing and typography hierarchy
    - Smooth animations and transitions
    - Responsive layout with proper error handling

#### ✨ `AddSkillScreen` & `AddHabitScreen`
- **Purpose**: Dedicated forms for creating new skills and habits.
- **Features**:
    - Intuitive input fields with suggestions and character counters.
    - Interactive selection for frequency, difficulty, and color-coding.
    - Seamless navigation between the two screens.

#### ✨ `MainTabNavigator` (Custom Component)
- **Purpose**: A highly interactive and animated main navigation hub.
- **Features**:
    - A floating menu button reveals the tab bar on press.
    - The central `+` button triggers a spring animation, presenting "Add Skill" and "Add Habit" options horizontally.
    - Uses `expo-blur` for a modern, blurred background effect on the tab bar.
    - Manages its own visibility state, providing a clean and focused UI.
    - **Redesigned Layout**: Fixed positioning issues with proper spacing and tab order
    - **Login Streak Integration**: Real daily login streak calculation and display

## 🌟 SkillShare Social Platform

### 🎯 Platform Overview
The SkillShare social platform transforms YiZ Planner from an individual learning app into a collaborative community-driven ecosystem. Users can share their 30-day skill plans, discover community-created content, and engage through social interactions.

### ✨ Key Social Screens

#### 🔥 `SocialFeedScreen` - Community Hub
- **Purpose**: Central social hub with Instagram-inspired interface for skill discovery and community engagement
- **Features**:
    - **Triple Tab Navigation**: Following, Discover, and Trending feeds with animated transitions
    - **Real-time Feed**: Dynamic skill posts with rich media and engagement metrics
    - **Optimistic Updates**: Instant UI updates for likes, downloads, and interactions
    - **Infinite Scroll**: Seamless pagination with pull-to-refresh functionality
    - **Header Animations**: Parallax scrolling effects and opacity transitions
    - **Floating Action Button**: Quick access to skill sharing functionality
- **UI Design**:
    - Modern card-based layout with gradient overlays
    - Professional typography with Material Design icons
    - Smooth scroll animations and micro-interactions
    - Responsive layout adapting to content length
- **Technical Implementation**:
    - Uses `FlatList` with performance optimizations
    - `useFocusEffect` for real-time data refresh
    - Animated scroll handling with `Animated.Value`
    - Comprehensive error handling and loading states

#### 🔍 `BrowseSkillsScreen` - Advanced Discovery
- **Purpose**: Comprehensive skill discovery interface with powerful search and filtering capabilities
- **Features**:
    - **Modern Tab System**: Discover, Trending, and Categories with pill-style navigation
    - **Advanced Search**: Real-time search with autocomplete and suggestion system
    - **Smart Filters**: Category, difficulty, rating, and custom task filters
    - **Trending Algorithm**: Time-based trending with engagement scoring
    - **Category Browsing**: Visual category selector with skill counts
    - **Sample Data Fallback**: Graceful fallback to demo data when API unavailable
- **UI Design**:
    - Gradient header with rounded corners and shadows
    - Card-based skill display with rich metadata
    - Empty states with actionable CTAs
    - Loading indicators and skeleton screens
- **Technical Implementation**:
    - Debounced search with performance optimization
    - Efficient pagination and caching strategies
    - Integration with SearchService for advanced algorithms
    - Responsive grid layout with proper spacing

#### 📚 `SharedSkillDetailScreen` - Immersive Skill Experience
- **Purpose**: Comprehensive view of community-shared skills with full social interaction capabilities
- **Features**:
    - **Hero Section**: Parallax background image with overlay gradients
    - **Tabbed Content**: Overview, Curriculum, and Comments with smooth transitions
    - **Social Actions**: Like, download, upvote, downvote, save with optimistic updates
    - **Comments System**: Threaded comments with nested replies and voting
    - **Custom Tasks**: Community-contributed enhancements with voting system
    - **Rich Metadata**: Creator info, stats, tags, and difficulty indicators
- **UI Design**:
    - Cinematic header with animated scaling and transparency
    - Material Design cards with proper elevation
    - Professional typography hierarchy
    - Color-coded interaction buttons
- **Technical Implementation**:
    - Complex scroll-based animations using `Animated.Value`
    - Real-time social interaction updates
    - Integration with InteractionService and CommentRepository
    - Error handling with graceful degradation

#### ✍️ `CreateSharedSkillScreen` & `ShareSkillScreen` - Content Creation
- **Purpose**: Intuitive interfaces for sharing personal skills with the community
- **Features**:
    - **Skill Selection**: Choose from personal skill repository
    - **Rich Descriptions**: Multi-line text input with character limits
    - **Tagging System**: Auto-suggested tags with category inference
    - **Visibility Controls**: Public/private sharing options
    - **Custom Task Inclusion**: Option to include community-contributed tasks
    - **Preview Mode**: Live preview before publishing
- **UI Design**:
    - Form-based interface with progressive disclosure
    - Real-time validation and feedback
    - Success animations and confirmations
- **Technical Implementation**:
    - Form validation using custom hooks
    - Integration with SocialService for skill sharing
    - Image handling and upload optimization

### 🔧 Social Components & Features

#### 🎨 `SharedSkillCard` - Social Post Component
- **Purpose**: Reusable card component for displaying skills in social feeds
- **Features**:
    - Compact skill preview with essential information
    - Interaction buttons (like, comment, download, share)
    - Creator information and profile links
    - Engagement metrics and visual indicators
    - Responsive layout for different screen sizes
- **Props**: `skill`, `onPress`, `onLike`, `onDownload`, `onUserPress`, `onComment`, `onShare`

#### 💬 `CommentsSection` - Threaded Comment System
- **Purpose**: Full-featured comment system with nested replies and moderation
- **Features**:
    - Threaded comment display with proper indentation
    - Like/unlike functionality for individual comments
    - Reply system with parent-child relationships
    - Real-time comment submission and updates
    - User profile integration with avatars
- **Technical Implementation**:
    - Recursive component structure for nested comments
    - Optimistic updates for immediate feedback
    - Integration with CommentRepository and InteractionService

#### 🔍 `SearchBar` & `SearchFilters` - Discovery Tools
- **Purpose**: Advanced search interface with filtering capabilities
- **Features**:
    - Real-time search with debouncing
    - Auto-suggestions and search history
    - Multi-criteria filtering (category, difficulty, rating)
    - Clear and reset functionality
    - Responsive design for mobile and tablet
- **Technical Implementation**:
    - Custom hooks for search state management
    - Integration with SearchService algorithms
    - Performance optimization with memoization

### 📊 Social Analytics & Metrics

#### 📈 Engagement Tracking
- **Like System**: Toggle-based liking with real-time counts
- **Rating System**: 5-star rating with optional reviews
- **Download Tracking**: Skill download metrics and user analytics
- **Comment Analytics**: Comment count and engagement scoring
- **Voting System**: Upvote/downvote for custom tasks and contributions

#### 🔥 Trending Algorithm
- **Time-based Scoring**: Recent activity weighted more heavily
- **Engagement Metrics**: Likes, downloads, comments, and ratings
- **Community Validation**: User voting and quality indicators
- **Category Normalization**: Fair representation across skill categories

### 📊 Chart Components (Stats Dashboard)

#### ✨ `StatCard`
- **Purpose**: Animated metric cards with number counting animations
- **Features**:
    - Smooth spring animations for card entrance
    - Animated number counting using `Animated.Value`
    - Configurable icons with circular backgrounds
    - Support for whole number display with `Math.ceil()`
    - Touch handling for interactive cards
- **Props**: `title`, `value`, `subtitle`, `icon`, `color`, `backgroundColor`, `animate`, `onPress`
- **Styling**: Dark theme with gradient borders and custom shadows

#### ✨ `StatsLineChart`
- **Purpose**: Line chart visualization for trend data
- **Features**:
    - Built on `react-native-chart-kit`
    - Bezier curve smoothing for elegant lines
    - Custom dot styling with stroke effects
    - Configurable chart dimensions and colors
    - Format Y-axis labels with whole numbers
- **Props**: `data`, `width`, `height`, `chartConfig`, `bezier`, `withDots`, `withShadow`
- **Styling**: Purple theme (#a855f7) with transparent background

#### ✨ `StatsBarChart`
- **Purpose**: Bar chart visualization for comparison data
- **Features**:
    - Green color scheme (#22c55e) for positive metrics
    - Dashed background grid lines
    - Configurable bar percentage and spacing
    - Values displayed on top of bars (optional)
- **Props**: `data`, `width`, `height`, `chartConfig`, `showValuesOnTopOfBars`
- **Styling**: Consistent with dark theme palette

#### ✨ `ProgressRing`
- **Purpose**: Circular progress indicator for completion percentages
- **Features**:
    - SVG-based circular progress visualization
    - Animated progress with smooth transitions
    - Customizable size, stroke width, and colors
    - Center text display with percentage
    - Whole number percentage display
- **Props**: `size`, `strokeWidth`, `progress`, `color`, `backgroundColor`, `textColor`
- **Implementation**: Uses `react-native-svg` for smooth rendering

#### ✨ `ActivityHeatMap`
- **Purpose**: Calendar-style activity visualization
- **Features**:
    - 30-day activity timeline display
    - Intensity-based color coding
    - Tooltip support for daily details
    - Responsive grid layout
    - GitHub-style activity squares
- **Props**: `data`, `width`, `height`, `colorScale`, `showTooltip`
- **Styling**: Heat map colors from light to dark based on activity intensity

---



## 🔌 API Documentation



### 🔐 Authentication Endpoints



#### Register User

```http

POST /auth/register

Content-Type: application/json



{

"username": "string",

"email": "string",

"password": "string"

}

```



**Response: 201 Created**

```json

{

"message": "User created successfully",

"token": "jwt_token_here",

"user": {

"_id": "user_id",

"username": "username",

"email": "email@example.com"

}

}

```



#### Login User

```http

POST /auth/login

Content-Type: application/json



{

"identifier": "username_or_email",

"password": "string"

}

```



**Response: 200 OK**

```json

{

"message": "Login successful",

"token": "jwt_token_here",

"user": {

"_id": "user_id",

"username": "username",

"email": "email@example.com"

}

}

```



#### Verify Token

```http

POST /auth/verify

Authorization: Bearer <token>

```



**Response: 200 OK**

```json

{

"valid": true,

"user": {

"_id": "user_id",

"username": "username",

"email": "email@example.com"

}

}

```



### 🤖 Plan Generation



#### Generate Learning Plan

```http

POST /generate-plan

Content-Type: application/json



{

"skill_name": "Python Programming"

}

```



**Response: 200 OK**

```json

{

"skill": "Python Programming",

"plan": {

"daily_tasks": [

{

"day": 1,

"title": "Day 1: Fundamentals and Setup",

"tasks": [

{

"description": "Set up Python development environment",

"resources": [

"Python.org official tutorial",

"Codecademy Python course"

]

},

{

"description": "Practice with simple print statements",

"resources": [

"Python exercises",

"Interactive Python shell"

]

}

]

}

// ... 29 more days

]

}

}

```

⚡ **Performance**: 
- **Cached responses**: Instant for repeated requests
- **Local fallback**: <1s when API is rate-limited  
- **AI generation**: <30s with timeout protection
- **Never fails**: Always returns a valid plan



### 🖼️ Skill & Habit Endpoints

#### Create Skill

```http
POST /api/v1/plans/skills
Content-Type: application/json
Authorization: Bearer <token>

{
  "skill_name": "Guitar",
  "difficulty": "beginner"
}
```

**Response: 201 Created**

```json
{
  "message": "Skill plan created successfully",
  "skill": {
    "_id": "skill_id",
    "title": "Guitar",
    "difficulty": "beginner",
    "image_url": "https://images.unsplash.com/...",  // 📷 auto-selected
    "status": "active",
    "curriculum": { "daily_tasks": [ /* 30-day plan */ ] },
    "created_at": "ISODate",
    "updated_at": "ISODate"
  }
}
```

#### Create Habit

```http
POST /api/v1/plans/habits
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Drink Water",
  "category": "health",
  "frequency": "daily",
  "color": "#14B8A6"
}
```

**Response: 201 Created**

```json
{
  "message": "Habit created successfully",
  "habit": {
    "_id": "habit_id",
    "title": "Drink Water",
    "category": "health",
    "frequency": "daily",
    "color": "#14B8A6",
    "icon_url": "https://images.unsplash.com/...",  // 🎨 auto-selected
    "pattern": { "frequency": "daily", "target_days": [1,2,3,4,5,6,7] },
    "streaks": { "current_streak": 0, "longest_streak": 0 },
    "created_at": "ISODate",
    "updated_at": "ISODate"
  }
}
```

#### Check-in Habit

```http
POST /api/v1/plans/habits/{id}/checkin
Content-Type: application/json
Authorization: Bearer <token>

{
  "date": "YYYY-MM-DD" // ISO date (defaults to today if omitted)
}
```

| Param | In   | Type   | Required | Description               |
|-------|------|--------|----------|---------------------------|
| id    | path | string | ✓        | Habit document `_id`      |
| date  | body | string | ✗        | Day to record completion  |

**Response: 200 OK**

```json
{
  "message": "Check-in recorded",
  "habit": { /* updated habit with streaks */ }
}
```

#### Get Skill By ID

```http
GET /api/v1/plans/skills/{id}
Authorization: Bearer <token>
```

Returns full skill document including curriculum & progress.

#### Delete Habit / Delete Skill

```http
DELETE /api/v1/plans/habits/{id}
DELETE /api/v1/plans/skills/{id}
Authorization: Bearer <token>
```

Soft-deletes the document (status → `archived`).

#### Refresh Skill Image

```http
PATCH /api/v1/plans/skills/{id}/refresh-image
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "message": "Image refreshed successfully",
  "skill": {
    "_id": "skill_id",
    "title": "Guitar",
    "image_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?refresh=3847",
    "updated_at": "2025-07-15T10:30:00Z"
  }
}
```

**Features**:
- Generates new skill-relevant background image based on skill title
- Uses enhanced categorization system for better image matching
- Includes cache-busting parameters to force UI refresh
- Maintains skill-specific categorization (music, programming, cooking, etc.)

#### Mark Skill Day Complete

```http
PATCH /api/v1/plans/skills/{id}/days/{day}/complete
Authorization: Bearer <token>
```

**Progressive Completion Logic**:
- Users can only complete the current day (sequential completion)
- Completion updates skill progress and advances to next day
- Includes validation to prevent skipping days

#### Undo Skill Day Complete

```http
PATCH /api/v1/plans/skills/{id}/days/{day}/undo
Authorization: Bearer <token>
```

**Undo Restrictions**:
- Can only undo the most recently completed day
- Maintains sequential completion integrity
- Updates progress tracking accordingly

#### Get User Statistics

```http
GET /api/v1/plans/stats
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "message": "Stats retrieved successfully",
  "stats": {
    "overview": {
      "total_skills": 5,
      "total_habits": 3,
      "days_active": 45,
      "total_skill_days_completed": 67,
      "total_habit_checkins": 89,
      "total_progress_points": 156
    },
    "skills": {
      "total_skills": 5,
      "active_skills": 3,
      "completed_skills": 2,
      "average_completion": 72,
      "total_days_completed": 67,
      "skills_breakdown": [
        {
          "id": "skill_id",
          "title": "Learn Python",
          "completion_percentage": 85,
          "completed_days": 25,
          "current_day": 26,
          "status": "active",
          "created_at": "2025-01-01T00:00:00Z",
          "image_url": "https://images.unsplash.com/..."
        }
      ],
      "completion_trend": [
        {
          "date": "2025-01-10",
          "completed_days": 3,
          "day_label": "Mon"
        }
      ]
    },
    "habits": {
      "total_habits": 3,
      "active_habits": 3,
      "total_checkins": 89,
      "current_streaks": 45,
      "longest_streak": 23,
      "consistency_score": 78,
      "habits_breakdown": [
        {
          "id": "habit_id",
          "title": "Morning Exercise",
          "category": "health",
          "color": "#14B8A6",
          "current_streak": 15,
          "longest_streak": 23,
          "total_completions": 67,
          "status": "active",
          "created_at": "2025-01-01T00:00:00Z",
          "icon_url": "https://images.unsplash.com/...",
          "recent_activity": 8
        }
      ],
      "weekly_checkins": [
        {
          "date": "2025-01-10",
          "checkins": 2,
          "day_label": "Mon"
        }
      ]
    },
    "activity_timeline": [
      {
        "date": "2025-01-10",
        "skill_activity": 1,
        "habit_checkins": 2,
        "total_activity": 3,
        "day_of_week": "Mon",
        "intensity": 0.75
      }
    ],
    "generated_at": "2025-01-16T12:00:00Z"
  }
}
```

**Key Features**:
- **Real-time Analytics**: Live calculation of user progress metrics
- **Comprehensive Coverage**: Skills, habits, streaks, and activity patterns
- **Whole Numbers**: All percentages and averages returned as integers (rounded up)
- **Timeline Data**: 30-day activity timeline with intensity scoring
- **Trend Analysis**: 7-day completion trends and weekly patterns
- **Consistency Scoring**: Habit completion rates over 30-day periods

### 🌟 SkillShare Social Platform API

#### Share a Skill with Community

```http
POST /api/v1/social/skills/share
Content-Type: application/json
Authorization: Bearer <token>

{
  "skill_id": "507f1f77bcf86cd799439011",
  "description": "Master Python programming with hands-on projects and real-world applications",
  "tags": ["python", "programming", "backend"],
  "visibility": "public",
  "include_custom_tasks": true
}
```

**Response: 201 Created**
```json
{
  "message": "Skill shared successfully",
  "shared_skill": {
    "shared_skill_id": "507f1f77bcf86cd799439012",
    "title": "Learn Python Programming",
    "description": "Master Python programming with hands-on projects and real-world applications",
    "category": "technology",
    "tags": ["python", "programming", "backend"],
    "has_custom_tasks": true,
    "visibility": "public"
  }
}
```

#### Browse Shared Skills

```http
GET /api/v1/social/skills?page=1&limit=20&category=technology&difficulty=beginner&min_rating=4.0
```

**Response: 200 OK**
```json
{
  "message": "Shared skills retrieved successfully",
  "skills": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Learn Python Programming",
      "description": "Master Python programming with hands-on projects",
      "difficulty": "beginner",
      "category": "technology",
      "tags": ["python", "programming"],
      "image_url": "https://images.unsplash.com/photo-...",
      "shared_by": {
        "_id": "507f1f77bcf86cd799439010",
        "username": "pythonmaster",
        "profile_image": "https://ui-avatars.com/api/?name=pythonmaster"
      },
      "engagement": {
        "likes_count": 42,
        "downloads_count": 18,
        "comments_count": 5,
        "average_rating": 4.7
      },
      "user_interactions": {
        "has_liked": false,
        "has_downloaded": false,
        "user_rating": null
      },
      "created_at": "2025-07-20T10:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 89,
    "has_next": true,
    "has_previous": false
  }
}
```

#### Get Shared Skill Detail

```http
GET /api/v1/social/skills/{skill_id}
Authorization: Bearer <token> (optional)
```

**Response: 200 OK**
```json
{
  "message": "Skill details retrieved successfully",
  "skill": {
    "_id": "507f1f77bcf86cd799439012",
    "title": "Learn Python Programming", 
    "description": "Master Python programming with hands-on projects",
    "curriculum": {
      "daily_tasks": [
        {
          "day": 1,
          "title": "Python Fundamentals",
          "tasks": [
            {
              "description": "Install Python and set up development environment",
              "resources": ["Python.org", "VS Code setup guide"]
            }
          ]
        }
      ]
    },
    "custom_tasks": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "day": 1,
        "title": "Build a Calculator App",
        "description": "Create your first Python application",
        "votes": 15,
        "contributor": "advanced_user"
      }
    ],
    "engagement": {
      "likes_count": 42,
      "downloads_count": 18,
      "comments_count": 5,
      "average_rating": 4.7
    }
  }
}
```

#### Download Shared Skill

```http
POST /api/v1/social/skills/{skill_id}/download
Authorization: Bearer <token>
```

**Response: 201 Created**
```json
{
  "message": "Skill downloaded successfully and added to your repository",
  "skill_id": "507f1f77bcf86cd799439014",
  "title": "Learn Python Programming"
}
```

#### Add Custom Task to Shared Skill

```http
POST /api/v1/social/skills/{skill_id}/days/{day}/tasks
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Build a Web Scraper",
  "description": "Create a Python script to scrape data from websites",
  "task_type": "project",
  "estimated_time": 120,
  "instructions": "1. Import required libraries\n2. Write scraping logic\n3. Handle errors",
  "resources": [
    {
      "title": "Beautiful Soup Tutorial",
      "url": "https://example.com/tutorial",
      "type": "tutorial"
    }
  ]
}
```

#### Social Interactions

```http
# Like/Unlike a shared skill
POST /api/v1/social/skills/{skill_id}/like
Authorization: Bearer <token>

# Rate a shared skill
POST /api/v1/social/skills/{skill_id}/rate
Content-Type: application/json
Authorization: Bearer <token>

{
  "rating": 5,
  "review": "Excellent skill plan with great explanations!"
}

# Add comment to shared skill
POST /api/v1/social/skills/{skill_id}/comments
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "This is an amazing skill plan! Thanks for sharing.",
  "parent_id": null
}

# Get comments for skill
GET /api/v1/social/skills/{skill_id}/comments?limit=100
```

#### Discovery & Search

```http
# Advanced search
GET /api/v1/discovery/search?q=python&difficulty=beginner&has_custom_tasks=true&page=1&limit=20

# Get trending skills
GET /api/v1/social/trending?period=week&limit=10

# Get skill categories
GET /api/v1/social/categories

# Get popular custom tasks
GET /api/v1/social/tasks/popular?limit=20
```

**Key Features**:
- **23+ API Endpoints**: Comprehensive social platform functionality
- **Real-time Interactions**: Live likes, comments, ratings, and downloads
- **Advanced Search**: Multi-criteria search with filters and pagination
- **Community Content**: User-contributed custom tasks and enhancements
- **Trending Algorithm**: Time-based trending with engagement scoring
- **Social Analytics**: Comprehensive interaction tracking and metrics

### 🔍 Health Check



#### System Health

```http

GET /health

```



**Response: 200 OK**

```json

{

"status": "healthy",

"message": "YiZ Planner API is running",

"timestamp": "2025-06-13T10:30:00Z"

}

```



### ❌ Error Responses



| Code | Description | Example |

|------|-------------|---------|

| `400` | Bad Request | Invalid input data |

| `401` | Unauthorized | Invalid credentials |

| `409` | Conflict | User already exists |

| `500` | Internal Server Error | Database connection issue |



---



## 🗄️ Database Schema



### 👥 Users Collection



```javascript

{

_id: ObjectId,

username: String, // unique index

email: String, // unique index

password_hash: String, // bcrypt hashed

created_at: ISODate, // auto-generated

updated_at: ISODate, // auto-updated

last_login: ISODate // tracked on login

}

```



### 🎸 Skills Collection

```javascript
{
 _id: ObjectId,
 user_id: ObjectId,
 title: String,
 skill_name: String,
 difficulty: String, // beginner | intermediate | advanced
 curriculum: Array,  // 30-day plan
 image_url: String,  // Unsplash-generated background
 progress: {
   completed_days: Number,
   completion_percentage: Number,
   current_day: Number,
   started_at: ISODate,
   last_activity: ISODate,
   projected_completion: ISODate
 },
 status: String, // active | completed | archived
 created_at: ISODate,
 updated_at: ISODate
}
```

### ✅ Habits Collection

```javascript
{
 _id: ObjectId,
 user_id: ObjectId,
 title: String,
 category: String, // e.g., health, productivity
 icon_url: String, // Unsplash-generated illustrative icon
 color: String, // hex colour used for UI accents
 pattern: {
   frequency: String, // daily | weekly | custom
   target_days: Array, // [1-7]
   reminder_time: Date
 },
 streaks: {
   current_streak: Number,
   longest_streak: Number,
   total_completions: Number
 },
 goals: {
   target_streak: Number,
   weekly_target: Number,
   monthly_target: Number
 },
 status: String, // active | paused | archived
 created_at: ISODate,
 updated_at: ISODate
}
```



### 📊 Database Indexes



```javascript

// Automatically created on first insert

db.users.createIndex({ "username": 1 }, { unique: true })

db.users.createIndex({ "email": 1 }, { unique: true })



// Future indexes for plans

db.plans.createIndex({ "user_id": 1 })

db.plans.createIndex({ "user_id": 1, "status": 1 })

```



---



## ⚙️ Setup & Installation



### 📋 Prerequisites



- **Node.js** 16+

- **Python** 3.11+

- **MongoDB** (local or Atlas)

- **Expo CLI**

- **OpenRouter API** key



### 🖥️ Backend Setup



```bash

# 1. Navigate to backend directory

cd backend



# 2. Create virtual environment

python -m venv .venv



# 3. Activate virtual environment

# Windows:

.\.venv\Scripts\activate

# macOS/Linux:

source .venv/bin/activate



# 4. Install dependencies

pip install -r requirements.txt



# 5. Configure environment

cp .env.sample .env

# Edit .env with your configuration:

# MONGO_URI=mongodb://localhost:27017/skillplan_db

# OPENROUTER_API_KEY=your_api_key_here

# JWT_SECRET_KEY=your_jwt_secret

# BCRYPT_ROUNDS=12

# FRONTEND_URL=http://localhost:8081



# 6. Run the server

python app.py

# 🚀 Server running on http://localhost:8080

```



### 📱 Frontend Setup



```bash

# 1. Navigate to frontend directory

cd frontend



# 2. Install dependencies

npm install



# 3. Configure environment

cp .env.sample .env

# Edit .env:

# EXPO_PUBLIC_API_BASE_URL=http://localhost:8080



# 4. Start development server

npx expo start -c



# 5. Run on your preferred platform:

# 📱 Scan QR code with Expo Go app

# 🤖 Press 'a' for Android emulator

# 🍎 Press 'i' for iOS simulator

# 🌐 Press 'w' for web browser

```



### 🔧 Development Environment Verification



```bash

# Test backend health

curl http://localhost:8080/health



# Test frontend connection

# Check Metro bundler output for environment variables

# Look for: "env: export EXPO_PUBLIC_API_BASE_URL=..."

```



---



## 🔄 Development Workflow



### 🌿 Git Workflow



```bash

# 1. Create feature branch

git checkout -b feature/amazing-new-feature



# 2. Make changes with quality checks

npm run lint # Frontend linting

npm run format # Code formatting

black . # Backend formatting

flake8 . # Backend linting



# 3. Test thoroughly

npm test # Frontend tests

pytest # Backend tests



# 4. Commit with semantic messages

git commit -m "feat: add user profile customization"



# 5. Push and create PR

git push origin feature/amazing-new-feature

# Create PR: feature/amazing-new-feature → develop → main

```



### 🔧 Adding New Features



#### 📱 Frontend Feature Development



```javascript

// 1. Create new screen

// src/screens/NewFeatureScreen.jsx

import React, { useState } from 'react';

import { View, Text } from 'react-native';



const NewFeatureScreen = () => {

const [state, setState] = useState(null);


return (

<View>

<Text>New Feature</Text>

</View>

);

};



export default NewFeatureScreen;



// 2. Add to navigation (App.js)

import NewFeatureScreen from './src/screens/NewFeatureScreen';



<Stack.Screen

name="NewFeature"

component={NewFeatureScreen}

options={{ title: 'New Feature' }}

/>



// 3. Create API integration

// src/api/newFeature.js

import axios from 'axios';

import { API_BASE_URL } from './apiConfig';



export const newFeatureAPI = async (data) => {

const response = await axios.post(`${API_BASE_URL}/new-feature`, data);

return response.data;

};

```



#### 🖥️ Backend Feature Development



```python

# 1. Add route (app.py or new blueprint)

@app.route('/new-feature', methods=['POST'])

def new_feature():

try:

data = request.get_json()

result = process_new_feature(data)

return jsonify({"status": "success", "data": result})

except Exception as e:

return jsonify({"error": str(e)}), 500



# 2. Add business logic (services/new_feature_service.py)

def process_new_feature(data):

# Validate input

if not data or 'required_field' not in data:

raise ValueError("Missing required field")


# Process data

result = perform_complex_operation(data)


return result



# 3. Add database operations (if needed)

class NewFeatureModel:

@staticmethod

def create(data):

result = current_app.db.new_feature.insert_one(data)

return result.inserted_id


@staticmethod

def find_by_id(feature_id):

return current_app.db.new_feature.find_one({"_id": ObjectId(feature_id)})

```



### 🧪 Testing Strategy



#### 📱 Frontend Testing

```bash

# Unit tests

npm test



# Component testing

npm run test:components



# E2E testing (if configured)

npm run test:e2e

```



#### 🖥️ Backend Testing

```bash

# Unit tests

pytest tests/



# API testing

python -m unittest test_api.py



# Coverage report

pytest --cov=. --cov-report=html

```



---



## ✨ Key Features Implementation



### 🔐 Authentication Flow



```mermaid

sequenceDiagram

participant U as User

participant F as Frontend

participant A as AuthContext

participant B as Backend

participant DB as Database


U->>F: Enter credentials

F->>B: POST /auth/login

B->>DB: Query user

DB->>B: User data

B->>B: Verify password

B->>F: {token, user}

F->>A: login(user, token)

A->>A: Store in AsyncStorage

A->>F: Update global state

F->>U: Navigate to main app

```



### 🤖 Plan Generation Process



```mermaid

sequenceDiagram

participant U as User

participant F as Frontend

participant B as Backend

participant AI as OpenRouter AI


U->>F: Enter skill name

F->>F: Show loading state

F->>B: POST /generate-plan

B->>AI: Generate plan request

AI->>B: AI-generated plan

B->>B: Validate & format

B->>F: Structured 30-day plan

F->>F: Hide loading state

F->>U: Display interactive plan

```
### 🎯 Habit Check-in Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as API Route
    participant HS as HabitService
    participant CR as CheckinRepository
    participant HR as HabitRepository
    participant DB as Database

    U->>F: Submit daily check-in
    F->>API: POST /habits/{id}/checkin
    API->>HS: process_checkin()
    HS->>CR: upsert_checkin()
    CR->>DB: Insert/Update checkin
    DB->>CR: Checkin saved
    CR->>HS: Return checkin
    HS->>HR: get_user_checkins()
    HR->>DB: Query all checkins
    DB->>HR: Checkin history
    HR->>HS: Return checkin data
    HS->>HS: calculate_streaks()
    HS->>HR: update_habit_streaks()
    HR->>DB: Update habit document
    DB->>HR: Streaks updated
    HR->>HS: Return updated habit
    HS->>API: Return checkin + streaks
    API->>F: JSON response
    F->>U: Show updated progress
```

### 🌟 SkillShare Social Flow

```mermaid
sequenceDiagram
    participant U as User
    participant SF as SocialFeedScreen
    participant BS as BrowseSkillsScreen
    participant SSD as SharedSkillDetailScreen
    participant API as Social API
    participant SS as SocialService
    participant DB as MongoDB

    Note over U,DB: Social Discovery Flow
    U->>SF: Open Social Feed
    SF->>API: GET /api/v1/social/feed
    API->>SS: get_social_feed()
    SS->>DB: Query shared_skills with interactions
    DB->>SS: Feed data with engagement metrics
    SS->>API: Enriched social feed
    API->>SF: JSON response
    SF->>U: Display feed with likes/comments

    Note over U,DB: Skill Discovery Flow
    U->>BS: Browse Skills
    BS->>API: GET /api/v1/social/skills?filters
    API->>SS: get_shared_skills(filters)
    SS->>DB: Query with category/difficulty filters
    DB->>SS: Filtered skills with pagination
    SS->>API: Search results
    API->>BS: Paginated skill list
    BS->>U: Display searchable skill grid

    Note over U,DB: Social Interaction Flow
    U->>SSD: View Skill Detail
    SSD->>API: GET /api/v1/social/skills/{id}
    API->>SS: get_shared_skill_detail()
    SS->>DB: Get skill + custom_tasks + comments
    DB->>SS: Complete skill data
    SS->>API: Detailed skill object
    API->>SSD: Full skill with interactions
    SSD->>U: Rich skill view with social actions

    Note over U,DB: Community Engagement
    U->>SSD: Like/Download/Comment
    SSD->>API: POST /api/v1/social/skills/{id}/like
    API->>SS: record_interaction()
    SS->>DB: Update plan_interactions collection
    DB->>SS: Interaction saved
    SS->>API: Updated engagement stats
    API->>SSD: Real-time metrics
    SSD->>U: Optimistic UI update
```

---


### 💾 State Persistence



```javascript

// AuthContext.js - JWT & User Data Persistence

const AuthContext = createContext();



export const AuthProvider = ({ children }) => {

const [user, setUser] = useState(null);

const [loading, setLoading] = useState(true);



// Load persisted data on app launch

useEffect(() => {

loadPersistedAuth();

}, []);



const loadPersistedAuth = async () => {

try {

const token = await AsyncStorage.getItem('authToken');

const userData = await AsyncStorage.getItem('userData');


if (token && userData) {

// Verify token is still valid

const isValid = await authAPI.verifyToken(token);

if (isValid) {

setUser(JSON.parse(userData));

} else {

await clearAuthData();

}

}

} catch (error) {

console.error('Error loading auth data:', error);

} finally {

setLoading(false);

}

};



const login = async (userData, token) => {

try {

await AsyncStorage.setItem('authToken', token);

await AsyncStorage.setItem('userData', JSON.stringify(userData));

setUser(userData);

} catch (error) {

console.error('Error saving auth data:', error);

}

};



const logout = async () => {

await clearAuthData();

setUser(null);

};



return (

<AuthContext.Provider value={{ user, login, logout, loading }}>

{children}

</AuthContext.Provider>

);

};

```



### 🔧 Error Handling Strategy



#### 📱 Frontend Error Handling

```javascript

const handleAPIError = (error) => {

if (error.response) {

// Server responded with error status

const message = error.response.data?.message || 'Server error occurred';

setError(message);


// Handle specific status codes

if (error.response.status === 401) {

// Token expired, redirect to login

logout();

}

} else if (error.request) {

// Network error

setError('Network error. Please check your connection.');

} else {

// Other error

setError('An unexpected error occurred.');

}


// Log error for debugging

console.error('API Error:', error);

};

```



#### 🖥️ Backend Error Handling

```python

from flask import jsonify

import logging



# Configure logging

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)



@app.errorhandler(Exception)

def handle_error(error):

logger.error(f"Unhandled error: {str(error)}")


# Don't expose internal errors in production

if app.debug:

error_message = str(error)

else:

error_message = "An internal server error occurred"


return jsonify({

"error": "Internal server error",

"message": error_message

}), 500



@app.errorhandler(400)

def handle_bad_request(error):

return jsonify({

"error": "Bad request",

"message": "Invalid request data"

}), 400

```



---



## 🚀 Deployment Guide



### 🌐 Frontend Deployment (Vercel)



#### 📋 Configuration



```json

// vercel.json

{

"builds": [

{

"src": "package.json",

"use": "@vercel/static-build",

"config": {

"distDir": "web-build"

}

}

],

"routes": [

{

"src": "/(.*)",

"dest": "/index.html"

}

]

}

```



#### 🚀 Deployment Steps



```bash

# 1. Install Vercel CLI

npm i -g vercel



# 2. Build for web

expo export:web



# 3. Deploy to Vercel

vercel --prod



# 4. Set environment variables in Vercel dashboard:

# EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.onrender.com

```



### 🖥️ Backend Deployment (Render)



#### 📋 Configuration



```python

# Procfile

web: gunicorn backend.app:app --bind 0.0.0.0:$PORT --timeout 120

```



#### ⚙️ Environment Variables



```bash

# Set in Render dashboard:

MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/skillplan_db

OPENROUTER_API_KEY=your_openrouter_key

JWT_SECRET_KEY=your_super_secret_jwt_key

FRONTEND_URL=https://your-frontend-url.vercel.app

BCRYPT_ROUNDS=12

FLASK_ENV=production

```



#### 🚀 Deployment Steps



1. **Connect Repository**: Link GitHub repo to Render

2. **Configure Build**:

- Build Command: `pip install -r requirements.txt`

- Start Command: `gunicorn backend.app:app --bind 0.0.0.0:$PORT`

3. **Set Environment Variables**: Add all required env vars

4. **Deploy**: Automatic deployment on git push



### 📱 Mobile App Distribution



#### 🍎 iOS (App Store)



```bash

# 1. Configure app.json for iOS

{

"expo": {

"ios": {

"bundleIdentifier": "com.yourcompany.yizplanner",

"buildNumber": "1.0.0"

}

}

}



# 2. Build for iOS

eas build --platform ios



# 3. Submit to App Store

eas submit --platform ios

```



#### 🤖 Android (Play Store)



```bash

# 1. Configure app.json for Android

{

"expo": {

"android": {

"package": "com.yourcompany.yizplanner",

"versionCode": 1

}

}

}



# 2. Build APK/AAB

eas build --platform android



# 3. Submit to Play Store

eas submit --platform android

```



---



## 🔧 Troubleshooting



### 📱 Common Frontend Issues



#### 🔄 Metro Bundler Issues

```bash

# Clear Metro cache

npx expo start --clear



# Reset npm cache

npm start -- --reset-cache



# Delete node_modules and reinstall

rm -rf node_modules package-lock.json

npm install

```



#### 🧭 Navigation Errors

```javascript

// Ensure proper navigation setup

import { NavigationContainer } from '@react-navigation/native';

import { createStackNavigator } from '@react-navigation/stack';



// Check screen imports

import HomeScreen from './src/screens/HomeScreen';



// Verify navigation usage

const navigation = useNavigation();

navigation.navigate('ScreenName', { param: 'value' });

```



#### 🌐 API Connection Issues

```javascript

// Debug API configuration

console.log('API Base URL:', API_BASE_URL);



// Test network connectivity

const testConnection = async () => {

try {

const response = await axios.get(`${API_BASE_URL}/health`);

console.log('✅ Backend connected:', response.data);

} catch (error) {

console.error('❌ Backend connection failed:', error.message);

}

};



// Check network permissions (app.json)

{

"expo": {

"permissions": ["INTERNET"]

}

}

```



### 🖥️ Common Backend Issues



#### 🗄️ MongoDB Connection

```python

# Test MongoDB connection

from pymongo import MongoClient

import os



try:

client = MongoClient(os.getenv('MONGO_URI'))

# Test connection

client.admin.command('ping')

print("✅ MongoDB connected successfully")

except Exception as e:

print(f"❌ MongoDB connection failed: {e}")

```



#### 🔗 CORS Issues

```python

# Ensure CORS is properly configured

from flask_cors import CORS



# Allow specific origins

CORS(app, origins=[

"http://localhost:8081", # Expo dev server

"https://yourapp.vercel.app", # Production frontend

"exp://192.168.0.116:8081" # Expo Go

])



# Debug CORS headers

@app.after_request

def after_request(response):

print(f"CORS headers: {response.headers}")

return response

```



#### 🤖 OpenRouter API Issues

```python

# Test OpenRouter API connection

import requests

import os



def test_openrouter_connection():

try:

response = requests.get(

"https://openrouter.ai/api/v1/models",

headers={"Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}"}

)

if response.status_code == 200:

print("✅ OpenRouter API connected")

else:

print(f"❌ OpenRouter API error: {response.status_code}")

except Exception as e:

print(f"❌ OpenRouter API connection failed: {e}")

```

#### 🚨 Plan Generation Issues (429 Rate Limiting)

**Problem**: Plan generation fails with 429 "Too Many Requests" errors

**Solution**: The smart AI service now handles this automatically:

```python
# Check for rate limiting in backend logs
tail -f /tmp/backend.log | grep "429"

# The system will automatically fall back to local generation
# when rate limited, providing instant responses
```

#### 🔄 Async/Sync Pattern Errors

**Problem**: API endpoints returning 500 errors due to async/sync mismatches

**Solution**: All repository methods are now synchronous:

```python
# ❌ OLD (caused errors)
@async
def create(self, data):
    return await self.collection.insert_one(data)

# ✅ NEW (works correctly)
def create(self, data):
    return self.collection.insert_one(data)
```

#### 📦 Frontend Package Compatibility

**Problem**: Build warnings about package versions and React Native architecture

**Solution**: Updated packages and disabled new architecture:

```bash
# Install correct versions
npm install babel-preset-expo@13.0.0

# Check app.json has:
"newArchEnabled": false
```

#### 🖼️ Image Refresh Not Working

**Problem**: Skill background images not refreshing when refresh button is clicked

**Solution**: The system now includes cache-busting parameters:

```javascript
// Check if image URL includes cache-busting parameter
console.log('Image URL:', skill.image_url);
// Should show: https://images.unsplash.com/photo-1234?refresh=5678

// If refresh not working, check API response
const response = await refreshSkillImage(skillId, token);
console.log('Refresh response:', response);
```

#### ✅ Habit Check-in State Issues

**Problem**: Habit check marks disappear when returning to the page, causing confusion about completion status

**Solution**: Fixed backend collection name inconsistency and improved frontend state management:

```javascript
// ✅ FIXED: Backend now consistently uses g.db.habit_checkins
// backend/api/v1/plans.py:227
checkin_repo = CheckinRepository(g.db.habit_checkins)  // was g.db.checkins

// ✅ FIXED: Frontend now uses backend checked_today field
const completedSet = new Set();
(data.habits || []).forEach(h => {
  if (h.checked_today) {  // Uses backend field instead of local state
    completedSet.add(h._id);
  }
});
setCompletedHabits(completedSet);
```

#### 📱 Double Check Mark Issue

**Problem**: Completed habits show both checkbox check mark and overlay check mark icon

**Solution**: Removed redundant overlay check mark in both screens:

```javascript
// ❌ REMOVED: Duplicate overlay check mark
{completedHabits.has(habit._id) && (
  <View style={styles.gridCompletedOverlay}>
    <MaterialIcons name="check-circle" size={16} color="#22C55E" />
  </View>
)}

// ✅ KEPT: Only the checkbox check mark
{completedHabits.has(habit._id) && (
  <MaterialIcons name="check" size={12} color="white" />
)}
```

#### 🎨 UI Layout Issues

**Problem**: Empty white space or misaligned elements in SkillDetailScreen

**Solution**: Layout fixes have been implemented:

```javascript
// Check content container styling
content: {
  marginTop: -30,        // Eliminates gap
  paddingTop: 30,        // Maintains spacing
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  backgroundColor: '#F8FAFC',
}

// Ensure proper section spacing
currentDaySection: {
  paddingHorizontal: 20,
  paddingBottom: 20,
}
```



### 🚀 Performance Issues



#### ⏱️ Plan Generation Timeout

```python

# Increase timeout in plan_service.py

response = requests.post(

url,

json=payload,

timeout=60, # Increased from 30 seconds

headers=headers

)

```



#### 📱 Frontend Rendering Performance

```javascript

// Optimize expensive components with React.memo

const ExpensiveComponent = React.memo(({ data }) => {

return <ComplexVisualization data={data} />;

});



// Optimize FlatList for large datasets

<FlatList

data={planDays}

renderItem={renderDayItem}

keyExtractor={(item) => item.day.toString()}

getItemLayout={(data, index) => ({

length: 80,

offset: 80 * index,

index

})}

removeClippedSubviews={true}

maxToRenderPerBatch={10}

windowSize={5}

/>

```



---



## 🔮 Future Improvements



### 🎯 Planned Features



| Priority | Feature              | Description                                                       | Timeline |
|----------|----------------------|-------------------------------------------------------------------|----------|
| 🔴 High  | **Progress Tracking**| Mark daily tasks as complete                                      | June  |
| 🟠 Medium| **Plan Persistence** | Save generated plans to a new `plans` collection and add `/plans/*` endpoints | June  |
| 🟡 Medium| **Push Notifications**| Daily learning-reminder notifications via Expo                   | June  |
| 🟢 Low   | **Gamification**     | Achievements & learning streak badges                             | June     |
| 🔵 Enhancement | **Smooth Animations** | Add transitions and animations to UI components | August 2025 |
| 🔵 Enhancement | **Enhanced Progress Visualizations** | Improve progress bars and completion indicators | August 2025 |

## ✨ Recently Implemented (June 2025)

| 🎉 Feature | Description |
|------------|-------------|
| **JWT Auth Persistence** | • App factory pattern in Flask (`app = create_app()`) <br>• JWT tokens (7-day expiry) signed with `HS256` <br>• `AuthContext` saves token/user in AsyncStorage and auto-verifies on app boot |
| **Secure Password Flow** | bcrypt (12 rounds) hashing, configurable via `BCRYPT_ROUNDS` |
| **CORS by Env** | `FRONTEND_URL` env-var controls allowed origin; dev URLs hard-coded for Expo  |
| **Cloud-Ready Config** | All secrets & URLs pulled from env (Render/Vercel); local `.env` loaded with `python-dotenv` |
| **Gunicorn Compatibility** | Top-level `app` export lets Render run `gunicorn backend.app:app` |
| **Skill/Habit Cover Images** | Automatic Unsplash image/icon fetched on creation (`aiohttp`, `UNSPLASH_ACCESS_KEY`) |
| **Dynamic Dashboard** | RepositoryScreen now pulls `/api/v1/plans` on focus → shows 1 active skill + up to 4 habits (View All/See All). |
| **In-App Plan Creation** | `AddSkillScreen` & `AddHabitScreen` wired to backend. • Skill: sends `skill_name` + `difficulty` (beginner/intermediate/advanced). • Habit: sends `title`, `frequency` (daily/weekly/custom) + `color` hex. |
| **Habit Daily Check-ins** | Grey tick → POST `/habits/{id}/checkin` for today → turns green; streak counters forthcoming. |
| **Plan Deletion** | Long-press trash can in All-plans screens deletes skill or habit via API. |
| **Enhanced Empty-States** | Motivational placeholders with icons appear when users have no skills or habits. |
| **Gender-neutral Avatars** | Profile avatars now use `ui-avatars.com` for dynamic, neutral imagery based on username. |
| **Floating Add Menu UX** | Skill/Habit quick-add buttons align centrally and animate above the nav bar. |
| **Discover & Stats Beta** | ExploreScreen and StatsScreen now show attractive beta notices outlining upcoming upload/browse and visual analytics features. |
| **🎨 Enhanced UI/UX (July 2025)** | • **Skill Image Refresh**: Three-dot menu with background image refresh functionality <br>• **Smart Image Categorization**: 10+ skill categories for relevant background images <br>• **SkillDetailScreen Redesign**: Modern gradient cards, improved spacing, professional layout <br>• **Progressive Day Completion**: Sequential completion with validation and undo functionality <br>• **Today's Focus Enhancement**: Sleek gradient design with task indicators and progress bars <br>• **Layout Optimization**: Fixed empty white space, improved alignment, consistent spacing |

## 🔧 Critical Fixes & Improvements (July 2025)

| 🛠️ Fix | Description | Impact |
|---------|-------------|---------|
| **🚀 Smart Plan Generation** | • Completely rewrote `AIService` with caching, rate limiting, and local fallbacks<br>• Added 60-second cooldown between API calls<br>• Implemented local template system for 4 skill categories<br>• Reduced API timeout from 60s to 30s | **MAJOR**: Plan generation now never fails, responds in <3s |
| **📦 Frontend Package Fixes** | • Updated `babel-preset-expo` to `13.0.0` for SDK 53 compatibility<br>• Fixed multiple package version conflicts<br>• Disabled React Native new architecture warnings | **HIGH**: Eliminated all build warnings and errors |
| **🔧 Backend Configuration** | • Fixed `OPENROUTER_API_KEY` environment variable naming<br>• Updated `config.py` with proper API key validation<br>• Enhanced error handling for missing environment variables | **HIGH**: Backend now starts reliably with proper config |
| **⚡ Async/Sync Pattern Fix** | • Removed incorrect async decorators from all repository classes<br>• Fixed `require_auth` decorator to work with synchronous functions<br>• Updated all API endpoints to use synchronous patterns | **CRITICAL**: Fixed all 500 errors from async/sync mismatches |
| **🎯 Enhanced API Endpoints** | • Updated `/api/v1/plans/skills` to work with new service architecture<br>• Enhanced habit creation with additional parameters (color, dates, reminder_time)<br>• Added proper error handling across all endpoints | **MEDIUM**: More robust API with better error responses |
| **🔍 Improved Error Handling** | • Added comprehensive logging for plan generation<br>• Implemented graceful fallback mechanisms<br>• Enhanced debugging capabilities with detailed error messages | **MEDIUM**: Better debugging and user experience |
| **🎨 UI/UX Enhancements** | • **Image Refresh System**: Added three-dot menu with image refresh functionality<br>• **Smart Categorization**: Enhanced UnsplashService with 10+ skill categories<br>• **SkillDetailScreen Redesign**: Modern gradient cards with improved layout<br>• **Progressive Completion**: Sequential day completion with validation<br>• **Today's Focus Enhancement**: Sleek gradient design with task indicators<br>• **Layout Optimization**: Fixed empty white space and improved alignment<br>• **Habit Check-in Fix**: Resolved state persistence and double check mark issues | **HIGH**: Professional UI with better user experience |
| **🔄 Habit System Overhaul** | • **Backend Collection Fix**: Fixed inconsistent `g.db.checkins` vs `g.db.habit_checkins` naming<br>• **State Persistence**: Habits now stay checked on page reload using backend `checked_today` field<br>• **Real-time Sync**: Both RepositoryScreen and MyHabitsScreen properly sync with backend data<br>• **Stats Integration**: Fixed stats endpoint to reflect actual habit completions | **CRITICAL**: Habit functionality now works reliably across all screens |
| **📱 UI Redesign (Latest)** | • **Compact Habit Cards**: Made RepositoryScreen habit cards smaller and more efficient<br>• **Grid Layout**: Converted MyHabitsScreen to 2-column grid layout for better space utilization<br>• **Single Check Mark**: Fixed double check mark issue by removing overlay indicator<br>• **Consistent Design**: Both screens now use similar compact grid layouts | **MEDIUM**: Improved visual consistency and space efficiency |

## 📊 Development Summary

### 🔧 Backend Enhancements
- **New Service**: `unsplash_service.py` with enhanced image categorization
- **New API Endpoint**: `PATCH /api/v1/plans/skills/{id}/refresh-image`
- **Enhanced Skill Service**: Added `refresh_skill_image()` method
- **Day Completion APIs**: Progressive completion with validation logic
- **Critical Database Fix**: Fixed collection naming inconsistency in `plans.py:227` (`g.db.habit_checkins`)
- **Habit Service Enhancement**: Improved `get_user_habits()` to properly set `checked_today` field
- **Stats Service Fix**: Corrected repository initialization for accurate habit statistics

### 🎨 Frontend Improvements
- **SkillDetailScreen**: Complete redesign with modern aesthetics
- **Three-dot Menu**: Added skill options modal with refresh/edit/delete
- **Progressive UI**: Sequential day completion with proper validation
- **Today's Focus**: Gradient cards with enhanced task management
- **Layout Fixes**: Eliminated white space and improved alignment
- **Habit State Management**: Fixed state persistence using backend `checked_today` field
- **Grid Layout Implementation**: Converted MyHabitsScreen to 2-column responsive grid
- **Compact Design**: Reduced RepositoryScreen habit card sizes for better space utilization
- **Visual Consistency**: Unified design patterns across both habit screens

### 🖼️ Image Management
- **Smart Categorization**: 10+ categories (languages, cooking, programming, etc.)
- **Cache-Busting**: Automatic refresh parameters for image updates
- **Fallback System**: Local images when Unsplash API unavailable
- **Skill-Relevant**: Images matched to skill type for better UX

### ✅ Habit System Architecture (Latest Implementation)

#### Backend Data Flow
```
HabitService.get_user_habits() → CheckinRepository.find_by_habit_and_date() → habit.checked_today = boolean
```

#### Frontend State Management
```
Page Load → getAllPlans() → Backend returns habits with checked_today → setCompletedHabits(Set)
Check-in → recordHabitCheckin() → Backend updates & returns habit → Sync local state
```

#### Key Implementation Details
- **Collection Consistency**: All endpoints now use `g.db.habit_checkins` (fixed inconsistency)
- **Real-time Sync**: Frontend state synchronizes with backend `checked_today` field on every screen focus
- **Optimistic Updates**: UI updates immediately, with rollback on API failure
- **Cross-Screen Persistence**: Habits stay checked when navigating between Repository/MyHabits screens
- **Stats Integration**: StatsScreen auto-refreshes with `useFocusEffect` to show updated completion rates

#### UI/UX Improvements
- **Grid Layout**: MyHabitsScreen now uses 2-column responsive grid (`48%` width cards)
- **Compact Cards**: RepositoryScreen cards reduced in size (90px min-height, 10px padding)
- **Single Check Mark**: Removed duplicate check mark overlays for cleaner visual design
- **Consistent Styling**: Both screens use unified compact grid card patterns

---

## 📑 Environment-Variable Reference

| Key | Where Used | Local Example | Prod Example |
|-----|-----------|---------------|--------------|
| `MONGO_URI` | Backend | `mongodb://localhost:27017/skillplan_db` | Atlas SRV string |
| `JWT_SECRET_KEY` | Backend | `dev-secret-change` | 64-char hex |
| `OPENROUTER_API_KEY` | Backend AI Service | `sk-or-v1-...` | Same (⚠️ **CRITICAL**: Must be correct name) |
| `AI_MODEL_NAME` | Backend AI Service | `deepseek/deepseek-r1-0528:free` | Same |
| `FRONTEND_URL` | Backend | `http://localhost:8081` | `https://<vercel-url>` |
| `BCRYPT_ROUNDS` | Backend | `12` | `12` |
| `UNSPLASH_ACCESS_KEY` | Backend Image Service | `UqKRPeL...` | Render secret |
| `EXPO_PUBLIC_API_BASE_URL` | Frontend | `http://192.168.0.116:8080` | `https://<render-url>` |

---

## 📝 Final Notes

### 🎉 SkillShare Social Platform - Complete Implementation

The SkillShare social platform represents a major evolution of YiZ Planner from an individual learning app to a comprehensive community-driven ecosystem. This implementation includes:

**✨ Complete Feature Set**:
- Full social feed with Following, Discover, and Trending tabs
- Advanced skill discovery with search, filters, and categorization
- Rich social interactions (likes, comments, ratings, downloads)
- Community-contributed custom tasks with voting system
- Real-time engagement metrics and trending algorithms
- Professional Instagram-inspired UI design

**🏗️ Robust Architecture**:
- 4 new database collections (shared_skills, custom_tasks, plan_interactions, plan_comments)
- 4 new service classes with comprehensive business logic
- 4 new repository classes following consistent patterns
- 23+ API endpoints covering all social functionality
- Comprehensive error handling and validation

**📱 Enhanced User Experience**:
- Seamless integration with existing skill/habit system
- Optimistic UI updates for instant feedback
- Advanced search and discovery capabilities
- Rich content creation and sharing tools
- Social analytics and engagement tracking

**🔧 Technical Excellence**:
- Consistent repository pattern architecture
- Comprehensive API documentation
- Real-time social interactions
- Professional UI components
- Performance-optimized data flow

### 🌟 SkillShare Platform Key Achievements

#### 📊 Social Database Collections
- **shared_skills**: Community-shared learning plans with engagement metrics
- **custom_tasks**: User-contributed enhancements to shared skills
- **plan_interactions**: Social interactions (likes, downloads, ratings, views)
- **plan_comments**: Threaded comment system with nested replies

#### 🔗 Platform Integration Points
- **SocialFeedScreen**: Instagram-inspired social hub with three-tab navigation
- **BrowseSkillsScreen**: Advanced discovery with search, filters, and trending
- **SharedSkillDetailScreen**: Immersive skill experience with social interactions
- **Social API Endpoints**: 23+ endpoints covering all social functionality

#### 🎯 Community Engagement Features
- **Like System**: Toggle-based liking with real-time counts
- **Comment System**: Threaded discussions with nested replies
- **Rating System**: 5-star ratings with optional reviews
- **Download Tracking**: Skills added to personal repositories
- **Custom Task Voting**: Community-driven skill improvements
- **Trending Algorithm**: Time-based engagement scoring

The SkillShare platform successfully transforms YiZ Planner into a complete social learning ecosystem while maintaining the app's core focus on structured, AI-powered skill development.

---

*This developer guide reflects the complete state of YiZ Planner as of July 26th, 2025, including the comprehensive SkillShare social platform implementation.*