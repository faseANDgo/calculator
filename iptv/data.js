/*
 * Katalog demo. Kanały „na żywo" korzystają z publicznych, ogólnodostępnych
 * strumieni testowych (Apple / Mux) używanych powszechnie do testowania
 * odtwarzaczy HLS. Filmy i seriale korzystają z produkcji Blender Foundation
 * (CC BY, domena otwarta) oraz oficjalnych plików demo Google — wszystkie
 * są legalne do odtwarzania i pobierania.
 */

const CHANNELS = [
    {
        id: "ch1",
        name: "StreamBox Film",
        category: "Film",
        color: "#e63946",
        nowPlaying: "Blok filmowy: kino akcji",
        streamUrl:
            "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8",
    },
    {
        id: "ch2",
        name: "StreamBox Sport",
        category: "Sport",
        color: "#2a9d8f",
        nowPlaying: "Studio sportowe na żywo",
        streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    },
    {
        id: "ch3",
        name: "StreamBox Kids",
        category: "Dzieci",
        color: "#f4a261",
        nowPlaying: "Poranek z bajkami",
        streamUrl:
            "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8",
    },
    {
        id: "ch4",
        name: "StreamBox News",
        category: "Informacje",
        color: "#264653",
        nowPlaying: "Serwis informacyjny",
        streamUrl: "https://test-streams.mux.dev/pts_shift/master.m3u8",
    },
    {
        id: "ch5",
        name: "StreamBox Muzyka",
        category: "Muzyka",
        color: "#9d4edd",
        nowPlaying: "Lista przebojów",
        streamUrl:
            "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
    },
];

const MOVIES = [
    {
        id: "m1",
        title: "Big Buck Bunny",
        year: 2008,
        genre: "Animacja",
        duration: "10 min",
        description:
            "Olbrzymi, dobroduszny królik mierzy się z trójką znęcających się nad nim gryzoni. Klasyka open-source animacji Blender Foundation.",
        poster: "https://picsum.photos/seed/bigbuckbunny/400/600",
        videoUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    },
    {
        id: "m2",
        title: "Sintel",
        year: 2010,
        genre: "Fantasy",
        duration: "15 min",
        description:
            "Samotna wojowniczka Sintel wyrusza na poszukiwanie młodego smoka, którego niegdyś uratowała i wychowała.",
        poster: "https://picsum.photos/seed/sintel/400/600",
        videoUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    },
    {
        id: "m3",
        title: "Tears of Steel",
        year: 2012,
        genre: "Sci-Fi",
        duration: "12 min",
        description:
            "Grupa wojowników i naukowców spotyka się w zrujnowanym Amsterdamie, by cofnąć skutki wojny robotów.",
        poster: "https://picsum.photos/seed/tearsofsteel/400/600",
        videoUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    },
    {
        id: "m4",
        title: "Elephants Dream",
        year: 2006,
        genre: "Sci-Fi",
        duration: "11 min",
        description:
            "Dwóch bohaterów, Proog i Emo, eksploruje surrealistyczny, mechaniczny świat pełen niebezpieczeństw.",
        poster: "https://picsum.photos/seed/elephantsdream/400/600",
        videoUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    },
    {
        id: "m5",
        title: "For Bigger Blazes",
        year: 2014,
        genre: "Akcja",
        duration: "1 min",
        description: "Krótki, dynamiczny materiał promocyjny pełen efektów ognia.",
        poster: "https://picsum.photos/seed/biggerblazes/400/600",
        videoUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    },
    {
        id: "m6",
        title: "For Bigger Fun",
        year: 2014,
        genre: "Komedia",
        duration: "1 min",
        description: "Lekki, humorystyczny klip demonstracyjny.",
        poster: "https://picsum.photos/seed/biggerfun/400/600",
        videoUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    },
    {
        id: "m7",
        title: "For Bigger Joyrides",
        year: 2014,
        genre: "Akcja",
        duration: "1 min",
        description: "Szybkie tempo, samochody i adrenalina w krótkiej formie.",
        poster: "https://picsum.photos/seed/biggerjoyrides/400/600",
        videoUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    },
    {
        id: "m8",
        title: "For Bigger Meltdowns",
        year: 2014,
        genre: "Dramat",
        duration: "1 min",
        description: "Intensywny, krótki materiał o dramatycznym wydźwięku.",
        poster: "https://picsum.photos/seed/biggermeltdowns/400/600",
        videoUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    },
];

const SERIES = [
    {
        id: "s1",
        title: "Kroniki Blendera",
        genre: "Animacja / Sci-Fi",
        description:
            "Antologia otwartych produkcji Blender Foundation — każdy odcinek to inna, samodzielna historia z tego samego uniwersum twórczego.",
        poster: "https://picsum.photos/seed/blenderchronicles/400/600",
        seasons: [
            {
                season: 1,
                episodes: [
                    {
                        id: "s1e1",
                        title: "Odcinek 1: Elephants Dream",
                        duration: "11 min",
                        videoUrl:
                            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                    },
                    {
                        id: "s1e2",
                        title: "Odcinek 2: Big Buck Bunny",
                        duration: "10 min",
                        videoUrl:
                            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                    },
                    {
                        id: "s1e3",
                        title: "Odcinek 3: Sintel",
                        duration: "15 min",
                        videoUrl:
                            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
                    },
                    {
                        id: "s1e4",
                        title: "Odcinek 4: Tears of Steel",
                        duration: "12 min",
                        videoUrl:
                            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
                    },
                ],
            },
        ],
    },
    {
        id: "s2",
        title: "Krótkie Historie",
        genre: "Akcja / Komedia",
        description:
            "Seria krótkich, dynamicznych odcinków — idealna na szybki seans w przerwie.",
        poster: "https://picsum.photos/seed/shortcuts/400/600",
        seasons: [
            {
                season: 1,
                episodes: [
                    {
                        id: "s2e1",
                        title: "Odcinek 1: Blazes",
                        duration: "1 min",
                        videoUrl:
                            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                    },
                    {
                        id: "s2e2",
                        title: "Odcinek 2: Fun",
                        duration: "1 min",
                        videoUrl:
                            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
                    },
                    {
                        id: "s2e3",
                        title: "Odcinek 3: Joyrides",
                        duration: "1 min",
                        videoUrl:
                            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
                    },
                    {
                        id: "s2e4",
                        title: "Odcinek 4: Meltdowns",
                        duration: "1 min",
                        videoUrl:
                            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
                    },
                ],
            },
        ],
    },
];
