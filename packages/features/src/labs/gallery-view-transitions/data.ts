export type GalleryImage = Readonly<{
    id: string
    title: string
    alt: string
    location: string
    photographer: string
    description: string
    url: string
    width: number
    height: number
}>

export const gallery_images: ReadonlyArray<GalleryImage> = [
    {
        id: "ridge-light",
        title: "Ridge light",
        alt: "Layered mountain ridges in warm evening light",
        location: "Dolomites, Italy",
        photographer: "Marek Piwnicki",
        description:
            "Late light separates the mountain layers while the valley falls into shadow.",
        url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&h=1200&q=85",
        width: 900,
        height: 1200,
    },
    {
        id: "forest-floor",
        title: "Forest floor",
        alt: "Sunlight passing between tall trees in a green forest",
        location: "Pacific Northwest, USA",
        photographer: "Casey Horner",
        description:
            "A narrow opening in the canopy brings depth and rhythm to a dense stand of trees.",
        url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&h=800&q=85",
        width: 1200,
        height: 800,
    },
    {
        id: "quiet-water",
        title: "Quiet water",
        alt: "A still alpine lake reflecting mountains and low clouds",
        location: "Alberta, Canada",
        photographer: "Luca Bravo",
        description:
            "A calm surface turns the lake into a second horizon beneath the cloud line.",
        url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&h=1250&q=85",
        width: 1000,
        height: 1250,
    },
    {
        id: "city-geometry",
        title: "City geometry",
        alt: "Geometric concrete architecture against a pale sky",
        location: "London, United Kingdom",
        photographer: "Samuel Zeller",
        description:
            "Hard edges and repeating windows reduce the building to a study in proportion.",
        url: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&h=900&q=85",
        width: 1200,
        height: 900,
    },
    {
        id: "open-road",
        title: "Open road",
        alt: "A road crossing a broad landscape beneath distant mountains",
        location: "South Island, New Zealand",
        photographer: "Tim Swaan",
        description:
            "The road gives the wide landscape a single line to follow toward the mountains.",
        url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&h=1350&q=85",
        width: 900,
        height: 1350,
    },
    {
        id: "blue-hour",
        title: "Blue hour",
        alt: "A coastal city glowing after sunset",
        location: "Santorini, Greece",
        photographer: "Alex Azabache",
        description:
            "The last daylight and the first lamps meet across the hillside above the sea.",
        url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&h=800&q=85",
        width: 1200,
        height: 800,
    },
    {
        id: "high-country",
        title: "High country",
        alt: "A steep green valley beneath snow-covered peaks",
        location: "Bernese Oberland, Switzerland",
        photographer: "Dino Reichmuth",
        description:
            "A high trail cuts through summer grass below the remaining winter snow.",
        url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1000&h=1400&q=85",
        width: 1000,
        height: 1400,
    },
    {
        id: "wild-meadow",
        title: "Wild meadow",
        alt: "A deer standing in a meadow surrounded by tall grass",
        location: "Bavaria, Germany",
        photographer: "Laura College",
        description:
            "The animal pauses at the edge of the meadow before disappearing into the trees.",
        url: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&h=900&q=85",
        width: 1200,
        height: 900,
    },
]

export const findGalleryImage = (id: string): GalleryImage | undefined =>
    gallery_images.find((image) => image.id === id)
