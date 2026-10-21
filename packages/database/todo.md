- [ ] When v4 supported: Effect Drizzle (drizzle>effect) or Emergente (effect schema>drizzle)
- [ ] Unified Schema: https://github.com/emergente-labs/effect-sql-model
- [ ] ./connect-effect-postgres.todo.mdx

---

Looking at my current handlers.ts, I'm defining a DatabaseClient tag locally which is not the right pattern. According to the guide, I should be using a service pattern where the database is accessed through a proper service layer.

<!--
https://www.npmjs.com/package/pg-here
https://github.com/search?q=drizzle+effect&type=repositories&s=updated&o=desc


goto apps? (db admin + db?)-->
