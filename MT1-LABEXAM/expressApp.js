// Part B: Library Management REST API using Express.js
import express from 'express';

const app = express();
const PORT = 4000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Allow the catalogue page (served from port 3000) to call this API
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Sample data (no database)
let books = [
  { id: 1, title: 'The Alchemist', author: 'Paulo Coelho', price: 350, category: 'Fiction', available: true },
  { id: 2, title: 'Atomic Habits', author: 'James Clear', price: 450, category: 'Self-Help', available: true },
  { id: 3, title: 'Wings of Fire', author: 'A. P. J. Abdul Kalam', price: 300, category: 'Biography', available: false },
  { id: 4, title: 'Clean Code', author: 'Robert C. Martin', price: 550, category: 'Programming', available: true },
  { id: 5, title: 'The Pragmatic Programmer', author: 'Andrew Hunt', price: 620, category: 'Programming', available: false },
  { id: 6, title: 'Sapiens', author: 'Yuval Noah Harari', price: 499, category: 'History', available: true },
  { id: 7, title: 'The Guide', author: 'R. K. Narayan', price: 280, category: 'Fiction', available: true },
  { id: 8, title: 'Deep Work', author: 'Cal Newport', price: 399, category: 'Self-Help', available: false }
];

// GET /books - retrieve all books
// Optional filters: ?search=clean&available=true&category=Programming
app.get('/books', (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const available = req.query.available;
  const category = String(req.query.category || '').trim().toLowerCase();

  const result = books.filter((book) => {
    const matchesSearch =
      !search || [book.title, book.author, book.category].some((field) => field.toLowerCase().includes(search));
    const matchesAvailability = available === undefined || available === '' || String(book.available) === available;
    const matchesCategory = !category || book.category.toLowerCase() === category;
    return matchesSearch && matchesAvailability && matchesCategory;
  });

  res.status(200).json(result);
});

// GET /books/:id - retrieve a book by id
app.get('/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = books.find((b) => b.id === id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.status(200).json(book);
});

// POST /books - add a new book
app.post('/books', (req, res) => {
  const { id, title, author, price, category } = req.body || {};

  if (id === undefined || !title || !author || price === undefined || !category) {
    return res
      .status(400)
      .json({ error: 'id, title, author, price and category are required' });
  }
  if (books.some((b) => b.id === Number(id))) {
    return res.status(409).json({ error: 'Book with this id already exists' });
  }

  const newBook = { id: Number(id), title, author, price, category, available: true };
  books.push(newBook);
  res.status(201).json({ message: 'Book added successfully', book: newBook });
});

// PUT /books/:id - update book details or availability (issue / return)
app.put('/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = books.findIndex((b) => b.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const { title, author, price, category, available } = req.body || {};
  if (
    title === undefined && author === undefined && price === undefined &&
    category === undefined && available === undefined
  ) {
    return res.status(400).json({ error: 'Provide at least one field to update' });
  }
  if (available !== undefined && typeof available !== 'boolean') {
    return res.status(400).json({ error: 'available must be true or false' });
  }

  // id stays the same; only provided fields are changed
  books[index] = {
    ...books[index],
    ...(title !== undefined && { title }),
    ...(author !== undefined && { author }),
    ...(price !== undefined && { price }),
    ...(category !== undefined && { category }),
    ...(available !== undefined && { available })
  };
  res.status(200).json({ message: 'Book updated successfully', book: books[index] });
});

// DELETE /books/:id - delete a book
app.delete('/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = books.findIndex((b) => b.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Book not found' });
  }
  const [deletedBook] = books.splice(index, 1);
  res.status(200).json({ message: 'Book deleted successfully', book: deletedBook });
});

// Invalid JSON body handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next(err);
});

// 404 for invalid routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Express Server running at http://localhost:${PORT}`);
});
