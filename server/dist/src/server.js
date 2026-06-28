"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const app = (0, app_1.createApp)();
app.listen(PORT, () => {
    console.log(`ElimuPopote API listening on http://localhost:${PORT}`);
});
