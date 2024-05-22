require("dotenv").config();
const pg = require("pg");
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_review_store"
);
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT = process.env.JWT;

// Function to create tables
const createTables = async () => {
  const SQL = `
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS items;
    DROP TABLE IF EXISTS users;
    
    CREATE TABLE users(
      id UUID PRIMARY KEY,
      username VARCHAR(20) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    );

    CREATE TABLE reviews(
      id UUID PRIMARY KEY,
      txt VARCHAR(255) NOT NULL,
      score INTEGER NOT NULL
    );

    CREATE TABLE items(
      id UUID PRIMARY KEY,
      title VARCHAR(100) NOT NULL UNIQUE,
      details VARCHAR(255) NOT NULL
    );

    CREATE TABLE comments(
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) NOT NULL,
      review_id UUID REFERENCES reviews(id) NOT NULL,
      content VARCHAR(255) NOT NULL,
      CONSTRAINT unique_user_id_review_id UNIQUE(user_id, review_id)
    );
  `;
  await client.query(SQL);
};

// Function to fetch all items
const fetchItems = async () => {
  const SQL = "SELECT * FROM items";
  try {
    const { rows } = await client.query(SQL);
    return rows;
  } catch (error) {
    console.error("Error fetching items", error);
  }
};

// Function to create a new item
const createItem = async ({ details, title }) => {
  const id = uuid.v4();
  const SQL =
    "INSERT INTO items(id, details, title) VALUES($1, $2, $3) RETURNING *";
  try {
    const item = await client.query(SQL, [id, details, title]);
    return item.rows[0];
  } catch (error) {
    console.error("Error creating item", error);
  }
};

// Function to fetch all users
const fetchUsers = async () => {
  const SQL = "SELECT * FROM users";
  try {
    const { rows } = await client.query(SQL);
    return rows;
  } catch (error) {
    console.error("Error fetching users", error);
  }
};

// Function to create a new user
const createUser = async ({ username, password }) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = uuid.v4();
  const SQL =
    "INSERT INTO users(id, username, password) VALUES($1, $2, $3) RETURNING *";
  try {
    const user = await client.query(SQL, [id, username, hashedPassword]);
    return user.rows[0];
  } catch (error) {
    console.error("Error creating user", error);
  }
};

// Function to create a new review
const createReview = async ({ txt, score }) => {
  const id = uuid.v4();
  const SQL =
    "INSERT INTO reviews(id, txt, score) VALUES($1, $2, $3) RETURNING *";
  try {
    const review = await client.query(SQL, [id, txt, score]);
    return review.rows[0];
  } catch (error) {
    console.error("Error creating review", error);
  }
};

// Function to fetch a specific item
const fetchItem = async (id) => {
  const SQL = "SELECT * FROM items WHERE id = $1";
  try {
    const { rows } = await client.query(SQL, [id]);
    return rows[0];
  } catch (error) {
    console.error("Error fetching item", error);
  }
};

// Function to create a new comment
const createUserComment = async ({ userId, reviewId, content }) => {
  try {
    const id = uuid.v4();
    const SQL =
      "INSERT INTO comments(id, user_id, review_id, content) VALUES($1, $2, $3, $4) RETURNING *";
    const comment = await client.query(SQL, [id, userId, reviewId, content]);
    return comment.rows[0];
  } catch (error) {
    console.error("Error creating comment", error);
  }
};

// Function to fetch all comments written by a specific user
const fetchUserComments = async (user_id) => {
  const SQL = "SELECT * FROM comments WHERE user_id = $1";
  try {
    const { rows } = await client.query(SQL, [user_id]);
    return rows;
  } catch (error) {
    console.error("Error fetching user comments", error);
  }
};

// Function to update a specific comment
const updateComment = async (id, { content }) => {
  const SQL = "UPDATE comments SET content = $1 WHERE id = $2 RETURNING *";
  try {
    const { rows } = await client.query(SQL, [content, id]);
    return rows[0];
  } catch (error) {
    console.error("Error updating comment", error);
  }
};

// Function to delete a specific comment
const deleteComment = async (id) => {
  const SQL = "DELETE FROM comments WHERE id = $1 RETURNING *";
  try {
    const { rows } = await client.query(SQL, [id]);
    return rows[0];
  } catch (error) {
    console.error("Error deleting comment", error);
  }
};

// Function to fetch a specific review
const fetchReview = async (id) => {
  const SQL = "SELECT * FROM reviews WHERE id = $1";
  try {
    const { rows } = await client.query(SQL, [id]);
    return rows[0];
  } catch (error) {
    console.error("Error fetching review", error);
  }
};

// Function to update a specific review
const updateReview = async (id, { txt, score }) => {
  const SQL =
    "UPDATE reviews SET txt = $1, score = $2 WHERE id = $3 RETURNING *";
  try {
    const { rows } = await client.query(SQL, [txt, score, id]);
    return rows[0];
  } catch (error) {
    console.error("Error updating review", error);
  }
};

// Function to delete a specific review
const deleteReview = async (id) => {
  const SQL = "DELETE FROM reviews WHERE id = $1 RETURNING *";
  try {
    const { rows } = await client.query(SQL, [id]);
    return rows[0];
  } catch (error) {
    console.error("Error deleting review", error);
  }
};

// Function to authenticate a user and return a JWT token
const authenticate = async ({ username, password }) => {
  const SQL = "SELECT * FROM users WHERE username = $1";
  try {
    const user = await client.query(SQL, [username]);
    if (user.rows.length) {
      const match = await bcrypt.compare(password, user.rows[0].password);
      if (match) {
        const token = jwt.sign({ id: user.rows[0].id }, JWT);
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error("Error authenticating user", error);
  }
};

// Function to find a user by their JWT token
const findUserByToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT);
    const SQL = "SELECT * FROM users WHERE id = $1";
    const user = await client.query(SQL, [decoded.id]);
    return user.rows[0];
  } catch (error) {
    console.error("Error finding user by token", error);
  }
};

module.exports = {
  client,
  createTables,
  createUser,
  fetchItems,
  createItem,
  createReview,
  fetchItem,
  fetchReview,
  updateReview,
  deleteReview,
  createUserComment,
  fetchUserComments,
  updateComment,
  deleteComment,
  authenticate,
  fetchUsers,
  findUserByToken,
};
