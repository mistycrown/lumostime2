export interface Comment {
    id: string;
    text: string;
    createdAt: string; // ISO date string
    author: string;
}

export interface Media {
    type: 'image' | 'video';
    url: string;
    caption?: string;
    aspectRatio?: string; // e.g., "16/9", "1/1", "3/4"
}

export type EntryType = 'normal' | 'daily_summary' | 'weekly_summary' | 'monthly_summary';

export interface DiaryEntry {
    id: string;
    type?: EntryType; // Defaults to 'normal' if undefined
    date: string; // ISO date string for sorting (Start Time)
    endDate?: string; // ISO date string (End Time)
    title?: string;
    content: string;
    location?: string;
    media?: Media[];
    comments?: Comment[];
    mood?: string;

    // Metadata fields
    tags?: string[];          // # Tags
    domains?: string[];       // % Domains/Areas
    relatedTodos?: string[];  // @ Todos/Contexts

    // Display control
    isFirstOfDay?: boolean;   // Whether this is the first entry of its day
}

export const MOCK_ENTRIES: DiaryEntry[] = [
    {
        id: '1',
        type: 'normal',
        date: '2024-01-20T14:30:00',
        title: 'Winter Solace',
        content: 'The snow started falling around noon. It wasn\'t the heavy, wet kind, but the soft powder that makes the whole city sound muffled and peaceful. I sat by the window for hours just watching the streetlights flicker on.',
        location: 'Kyoto, Japan',
        media: [
            { type: 'image', url: 'https://picsum.photos/800/600?random=1' },
            { type: 'image', url: 'https://picsum.photos/600/800?random=2' }
        ],
        tags: ['❄️ Weather', 'Travel'],
        domains: ['Personal Life'],
        comments: [
            { id: 'c1', text: 'Remember to buy more coffee beans tomorrow.', createdAt: '2024-01-20T18:00:00', author: 'Me' }
        ]
    },
    {
        id: 'summary-day-1',
        type: 'daily_summary',
        date: '2024-01-20T23:00:00',
        title: 'Daily Reflection',
        content: 'A quiet day centered around observation. Felt a sense of calm returning after a hectic week. Rated: 8/10.',
        mood: 'Peaceful',
        domains: ['Wellness'],
        comments: []
    },
    {
        id: '2',
        type: 'normal',
        date: '2024-01-18T09:15:00',
        title: 'Thesis Writing',
        content: 'Submitted the first draft of chapter 4. It felt rough, but getting it out of my head was the most important step.',
        mood: 'Relieved',
        relatedTodos: ['Cultural Geometry Writing'],
        tags: ['🎓 Learning', '✒️ Writing'],
        domains: ['🏛️ PhD Topic'],
        comments: []
    },
    {
        id: 'summary-week-1',
        type: 'weekly_summary',
        date: '2024-01-19T20:00:00',
        title: 'Week 3 Review',
        content: 'Key achievements: Started sketching, visited the gallery. \nArea for improvement: Sleep schedule slipped.',
        comments: []
    },
    {
        id: '3',
        type: 'normal',
        date: '2024-01-15T19:45:00',
        title: 'Gallery Visit',
        content: 'Found a small exhibit tucked away in the alley. The lighting was exquisite. Minimalist structures casting long, dramatic shadows.',
        location: 'Modern Art Museum',
        tags: ['Art', 'Inspiration'],
        relatedTodos: ['Visit Downtown Gallery'],
        media: [
            { type: 'image', url: 'https://picsum.photos/800/800?random=3' }
        ],
        comments: [
            { id: 'c2', text: 'Note: Look up the artist name later.', createdAt: '2024-01-15T21:00:00', author: 'Me' },
            { id: 'c3', text: 'Tickets for next month are on sale.', createdAt: '2024-01-16T10:00:00', author: 'System' }
        ]
    },
    {
        id: '4',
        type: 'normal',
        date: '2024-01-12T12:00:00',
        title: 'The Old Café',
        content: 'Returned to the place where we used to study. The tables are different, but the smell of roasted hazelnut is exactly the same.',
        media: [
            { type: 'image', url: 'https://picsum.photos/400/400?random=4' },
            { type: 'image', url: 'https://picsum.photos/400/400?random=5' },
            { type: 'image', url: 'https://picsum.photos/400/400?random=6' }
        ],
        comments: []
    },
    {
        id: 'summary-month-dec',
        type: 'monthly_summary',
        date: '2023-12-31T23:59:59',
        title: 'December Retrospective',
        content: 'Closing out the year. It was a month of reconnection and rest. 2024 feels promising.',
        comments: []
    }
];

export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
