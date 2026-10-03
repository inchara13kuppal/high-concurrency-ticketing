import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

const details = [
  {
    event_id: "20000000-0000-4000-8000-000000000001",
    image_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=85",
    description: "A special screening of Imtiaz Ali's musical romance, with a big-screen sound mix and a celebration of its celebrated soundtrack.",
    tags: ["Bollywood", "Special screening", "Hindi cinema"],
    director: "Imtiaz Ali",
    lead_artists: ["Ranbir Kapoor", "Nargis Fakhri"],
    music_director: "A. R. Rahman",
    faqs: [
      { question: "What language is the film in?", answer: "The film is in Hindi with English subtitles." },
      { question: "When do doors open?", answer: "Doors open 45 minutes before the screening." }
    ]
  },
  {
    event_id: "20000000-0000-4000-8000-000000000002",
    image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=85",
    description: "Experience Prashanth Neel's high-energy Kannada action film on the big screen, with a specially tuned presentation of Ravi Basrur's score.",
    tags: ["Sandalwood", "Kannada cinema", "Special screening"],
    director: "Prashanth Neel",
    lead_artists: ["Yash", "Srinidhi Shetty", "Sanjay Dutt"],
    music_director: "Ravi Basrur",
    faqs: [
      { question: "What language is the film in?", answer: "The film is in Kannada with English subtitles." },
      { question: "When do doors open?", answer: "Doors open 45 minutes before the screening." }
    ]
  },
  {
    event_id: "20000000-0000-4000-8000-000000000003",
    image_url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=85",
    description: "Celebrate Atlee's action spectacle in a premium screening, featuring Shah Rukh Khan, Nayanthara, and Vijay Sethupathi.",
    tags: ["Bollywood", "Hindi cinema", "Special screening"],
    director: "Atlee",
    lead_artists: ["Shah Rukh Khan", "Nayanthara", "Vijay Sethupathi"],
    music_director: "Anirudh Ravichander",
    faqs: [
      { question: "What language is the film in?", answer: "The film is in Hindi with English subtitles." },
      { question: "When do doors open?", answer: "Doors open 45 minutes before the screening." }
    ]
  },
  {
    event_id: "20000000-0000-4000-8000-000000000004",
    image_url: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1400&q=85",
    description: "Return to Rishab Shetty's atmospheric Kannada folklore film in a dedicated big-screen presentation of its story, performances, and score.",
    tags: ["Sandalwood", "Kannada cinema", "Special screening"],
    director: "Rishab Shetty",
    lead_artists: ["Rishab Shetty", "Sapthami Gowda", "Kishore"],
    music_director: "B. Ajaneesh Loknath",
    faqs: [
      { question: "What language is the film in?", answer: "The film is in Kannada with English subtitles." },
      { question: "When do doors open?", answer: "Doors open 45 minutes before the screening." }
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
    collection.updateOne(
      { event_id },
      { $set: { event_id, ...document }, $unset: { cast: "" } },
      { upsert: true },
    )
  ));
  console.log(`Seeded ${details.length} event detail documents.`);
} finally {
  await client.close();
}