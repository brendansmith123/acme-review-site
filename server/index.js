const {
  client,
  createTables,
  createUser,
  fetchItems,
  createItem,
  createReview,
  fetchItem,
  fetchReview,
  fetchUserReviews,
  updateUserReview,
  deleteUserReview,
  createUserComment,
  fetchUserComments,
  updateUserComment,
  deleteUserComment,
  authenticate,
  findUserByToken,
} = require("./db");

const express = require("express");
const app = express();

app.use(express.json());
app.use(require("morgan")("dev"));

// Middleware to check if user is logged in
const isLoggedIn = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      throw new Error("Authorization header is missing");
    }
    const token = req.headers.authorization.replace("Bearer ", "");
    req.user = await findUserByToken(token);
    if (!req.user) {
      throw new Error("Invalid token");
    }
    next();
  } catch (error) {
    res.status(401).send({ error: "Unauthorized" });
  }
};

// Route to register a new user
app.post("/users/register", async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    res.status(201).send(user);
  } catch (error) {
    next(error);
  }
});

// Route to login a user and return a JWT token
app.post("/users/login", async (req, res, next) => {
  try {
    const token = await authenticate(req.body);
    res.send({ token });
  } catch (error) {
    next(error);
  }
});

// Route to get the logged-in user's details
app.get("/users/me", isLoggedIn, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (error) {
    next(error);
  }
});

// Route to fetch all items
app.get("/items", async (req, res, next) => {
  try {
    const items = await fetchItems();
    res.send(items);
  } catch (error) {
    next(error);
  }
});

// Route to fetch details of a specific item
app.get("/items/:id", async (req, res, next) => {
  try {
    const item = await fetchItem(req.params.id);
    if (!item) {
      return res.status(404).send({ error: "Item not found" });
    }
    res.send(item);
  } catch (error) {
    next(error);
  }
});

// Route to create a new item only accessible to logged-in users
app.post("/items", isLoggedIn, async (req, res, next) => {
  try {
    const { title, details } = req.body;
    if (!title || !details) {
      return res.status(400).send({ error: "Title and details are required" });
    }
    const item = await createItem({ title, details });
    res.status(201).send(item);
  } catch (error) {
    next(error);
  }
});

// Route to create a new review for a specific item only accessible to logged-in users
app.post("/items/:id/reviews", isLoggedIn, async (req, res, next) => {
  try {
    const review = await createReview({
      ...req.body,
      userId: req.user.id,
      itemId: req.params.id,
    });
    res.status(201).send(review);
  } catch (error) {
    next(error);
  }
});

// Route to fetch details of a specific review
app.get("/reviews/:id", async (req, res, next) => {
  try {
    const review = await fetchReview(req.params.id);
    if (!review) {
      return res.status(404).send({ error: "Review not found" });
    }
    res.send(review);
  } catch (error) {
    next(error);
  }
});

// Route to fetch all reviews written by the logged-in user
app.get("/users/me/reviews", isLoggedIn, async (req, res, next) => {
  try {
    const reviews = await fetchUserReviews(req.user.id);
    res.send(reviews);
  } catch (error) {
    next(error);
  }
});

// Route to update a specific review, only accessible to the user who wrote the review
app.put("/reviews/:id", isLoggedIn, async (req, res, next) => {
  try {
    const review = await updateUserReview({
      ...req.body,
      userId: req.user.id,
      reviewId: req.params.id,
    });
    res.send(review);
  } catch (error) {
    next(error);
  }
});

// Route to delete a specific review, only accessible to the user who wrote the review
app.delete("/reviews/:id", isLoggedIn, async (req, res, next) => {
  try {
    const review = await deleteUserReview(req.params.id, req.user.id);
    res.send(review);
  } catch (error) {
    next(error);
  }
});

// Route to fetch all comments written by the logged-in user
app.get("/users/me/comments", isLoggedIn, async (req, res, next) => {
  try {
    const comments = await fetchUserComments(req.user.id);
    res.send(comments);
  } catch (error) {
    next(error);
  }
});

// Route to create a comment on a specific review, only accessible to logged-in users
app.post("/reviews/:id/comments", isLoggedIn, async (req, res, next) => {
  try {
    const comment = await createUserComment({
      userId: req.user.id,
      reviewId: req.params.id,
      content: req.body.content,
    });
    res.status(201).send(comment);
  } catch (error) {
    next(error);
  }
});

// Route to update a specific comment, only accessible to the user who wrote the comment
app.put("/comments/:id", isLoggedIn, async (req, res, next) => {
  try {
    const comment = await updateUserComment({
      userId: req.user.id,
      reviewId: req.params.id,
      content: req.body.content,
    });
    res.send(comment);
  } catch (error) {
    next(error);
  }
});

// Route to delete a specific comment, only accessible to the user who wrote the comment
app.delete("/comments/:id", isLoggedIn, async (req, res, next) => {
  try {
    const comment = await deleteUserComment(req.params.id, req.user.id);
    res.send(comment);
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: "Internal Server Error" });
});

app.get("/", (req, res) => {
  res.send("Server is running successfully");
});

const init = async () => {
  try {
    await client.connect();
    await createTables();
    console.log("Database connected and tables created");
    await seedDatabase();
  } catch (error) {
    console.error("Database initialization failed", error);
  }
};

const seedDatabase = async () => {
  try {
    const users = [
      { username: "Lebron", password: "Lakers" },
      { username: "Angel Reece", password: "LSU" },
    ];

    const createdUsers = [];
    for (const user of users) {
      const createdUser = await createUser(user);
      createdUsers.push(createdUser);
    }

    const items = [
      {
        title: "Life of Kobe",
        details: "Kobe's life story",
        userId: createdUsers[0].id,
      },
      {
        title: "Life of Shaq",
        details: "Shaq's life story",
        userId: createdUsers[1].id,
      },
    ];

    const createdItems = [];
    for (const item of items) {
      const createdItem = await createItem(item);
      createdItems.push(createdItem);
    }

    const reviews = [
      {
        txt: "Great book on Kobe",
        score: 5,
        userId: createdUsers[1].id,
        itemId: createdItems[0].id,
      },
      {
        txt: "Great book on Shaq",
        score: 4,
        userId: createdUsers[0].id,
        itemId: createdItems[1].id,
      },
    ];

    const createdReviews = [];
    for (const review of reviews) {
      const createdReview = await createReview(review);
      createdReviews.push(createdReview);
    }

    // Sample comments
    const comments = [
      {
        content: "Kobe is top 3 best nba players of all time",
        userId: createdUsers[0].id,
        reviewId: createdReviews[0].id,
      },
      {
        content: "Shaq is the most dominant player of all time",
        userId: createdUsers[1].id,
        reviewId: createdReviews[1].id,
      },
    ];

    // Insert comments
    for (const comment of comments) {
      await createUserComment(comment);
    }

    console.log("Database seeded with dummy data");
  } catch (error) {
    console.error("Seeding failed", error);
  }
};
const PORT = process.env.PORT || 3000;

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

init();
