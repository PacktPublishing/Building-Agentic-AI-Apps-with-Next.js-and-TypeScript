erDiagram
    USERS {
        uuid id PK
        text email
        text name
        text avatar_url
        timestamp created_at
    }

    TRIPS {
        uuid id PK
        uuid user_id FK
        text title
        text destination
        date start_date
        date end_date
        numeric budget
        timestamp created_at
    }

    ACTIVITIES {
        uuid id PK
        uuid trip_id FK
        text type
        text title
        text description
        jsonb location
        numeric price
        timestamptz start_time
        timestamptz end_time
        timestamp created_at
    }

    PREFERENCES {
        uuid id PK
        uuid user_id FK
        text travel_style
        text[] preferred_airlines
        text notes
    }

    AI_SESSIONS {
        uuid id PK
        uuid user_id FK
        uuid trip_id FK
        text prompt
        jsonb response
        timestamp created_at
    }

    USERS ||--o{ TRIPS : "creates"
    TRIPS ||--o{ ACTIVITIES : "includes"
    USERS ||--o| PREFERENCES : "has"
    USERS ||--o{ AI_SESSIONS : "owns"
    TRIPS ||--o{ AI_SESSIONS : "linked"

    %% Qdrant side
    TRAVEL_KNOWLEDGE {
        uuid id
        vector embedding
        text content
        jsonb metadata
    }

    USER_SESSIONS {
        uuid id
        vector embedding
        text content
        jsonb metadata
    }
