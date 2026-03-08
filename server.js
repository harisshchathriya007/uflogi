import app from "./server/server.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`UrbanFlow SmartRoute+ API listening on port ${PORT}`);
});
