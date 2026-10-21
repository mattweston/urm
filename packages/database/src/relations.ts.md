import { defineRelations } from "drizzle-orm";
import \* as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
preferences: {
user: r.one.users({
from: r.preferences.userId,
to: r.users.id
}),
},
users: {
preferences: r.many.preferences(),
},
clientsInZero0Cvr: {
instancesInZero0Cvr: r.one.instancesInZero0Cvr({
from: r.clientsInZero0Cvr.clientGroupID,
to: r.instancesInZero0Cvr.clientGroupID
}),
},
instancesInZero0Cvr: {
clientsInZero0Cvrs: r.many.clientsInZero0Cvr(),
queriesInZero0Cvrs: r.many.queriesInZero0Cvr(),
},
desiresInZero0Cvr: {
queriesInZero0Cvr: r.one.queriesInZero0Cvr({
from: [r.desiresInZero0Cvr.clientGroupID, r.desiresInZero0Cvr.queryHash],
to: [r.queriesInZero0Cvr.clientGroupID, r.queriesInZero0Cvr.queryHash]
}),
},
queriesInZero0Cvr: {
desiresInZero0Cvrs: r.many.desiresInZero0Cvr(),
instancesInZero0Cvr: r.one.instancesInZero0Cvr({
from: r.queriesInZero0Cvr.clientGroupID,
to: r.instancesInZero0Cvr.clientGroupID
}),
},
rowsInZero0Cvr: {
rowsVersionInZero0Cvr: r.one.rowsVersionInZero0Cvr({
from: r.rowsInZero0Cvr.clientGroupID,
to: r.rowsVersionInZero0Cvr.clientGroupID
}),
},
rowsVersionInZero0Cvr: {
rowsInZero0Cvrs: r.many.rowsInZero0Cvr(),
},
}))
