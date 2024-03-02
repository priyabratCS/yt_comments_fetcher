const app = require("./app");
require('dotenv').config();

app.listen(8080, () => {
  console.log(`Server started...`);
});

