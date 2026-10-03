import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

const details = [
  {
    event_id: "20000000-0000-4000-8000-000000000001",
    image_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=85",
    description: "A late-night collision of live music, open-air food stalls, and art installations. Come hungry, leave with a new favorite band.",
    tags: ["Live music", "Nightlife", "Outdoor"],
    cast: ["Mira Sol", "Glass Harbour", "DJ Vela"],
    faqs: [
      { question: "Are doors open all night?", answer: "Doors open at 6:30 PM. Re-entry is not available." },
      { question: "Is this event 18+?", answer: "Guests must be 18 or older and bring a valid photo ID." }
    ]
  },
  {
    event_id: "20000000-0000-4000-8000-000000000002",
    image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=85",
    description: "Avery Park brings the new record to the stage for one vivid, full-band night in Los Angeles.",
    tags: ["Concert", "Indie", "All ages"],
    cast: ["Avery Park", "June Arcade"],
    faqs: [
      { question: "When do doors open?", answer: "Doors open one hour before showtime." },
      { question: "Can I transfer my ticket?", answer: "Tickets can be transferred from your account before the event." }
    ]
  },
  {
    event_id: "20000000-0000-4000-8000-000000000003",
    image_url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=85",
    description: "A garden after dark, built from live electronic sets, immersive light, and a dance floor under the open sky.",
    tags: ["Electronic", "Festival", "Outdoor"],
    cast: ["Lumen", "North Star", "Iris Echo"],
    faqs: [
      { question: "Is the event outdoors?", answer: "The main stage is outdoors. Please check the forecast and dress comfortably." },
      { question: "Are food and drinks available?", answer: "Food and non-alcoholic drinks are available from local vendors." }
    ]
  },
  {
    event_id: "20000000-0000-4000-8000-000000000004",
    image_url: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1400&q=85",
    description: "A beloved classic on a giant screen, with a city skyline for a backdrop. Bring a blanket and settle in.",
    tags: ["Film", "Outdoor", "Date night"],
    cast: ["Special screening"],
    faqs: [
      { question: "Can I bring a blanket?", answer: "Yes, blankets are welcome. Low-profile chairs are also permitted." },
      { question: "What happens if it rains?", answer: "If the screening is postponed, ticket holders will be notified by email." }
    ]
  }
];

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db();
  const collection = db.collection("event_details");
  const reviews = db.collection("reviews");
  await Promise.all([
    collection.createIndex({ event_id: 1 }, { unique: true }),
    reviews.createIndex({ event_id: 1, created_at: -1 }),
    reviews.createIndex({ event_id: 1, user_id: 1 }, { unique: true }),
  ]);
  await Promise.all(details.map(({ event_id, ...document }) =>
    collection.updateOne({ event_id }, { $set: { event_id, ...document } }, { upsert: true })
  ));
  console.log(`Seeded ${details.length} event detail documents.`);
} finally {
  await client.close();
}