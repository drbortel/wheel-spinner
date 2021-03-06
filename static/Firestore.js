/*
Copyright 2020 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import * as Util from './Util.js';

export function logUserActivity(db, serverNow, uid) {
  return db.doc(`accounts/${uid}`).set({
    uid: uid,
    lastActive: serverNow
  })
}

export async function getWheels(db, uid) {
  const snap = await db.collection(`accounts/${uid}/wheels`).get();
  const wheels = [];
  snap.forEach(function(doc) {
    wheels.push(doc.data().config);
  });
  return wheels.sort(alphabeticallyNonCaseSensitiveByTitle);
}

export async function logWheelRead(db, serverNow, uid, wheelTitle) {
  const title = Util.sanitizeWheelTitle(wheelTitle);
  let docRef = db.doc(`accounts/${uid}/wheels/${title}`);
  let doc = await docRef.get();
  if (doc.exists) {
    let wheelData = doc.data();
    let data = {
      lastRead: serverNow,
      readCount: wheelData.readCount + 1,
    };
    await docRef.update(data);
  }
}

export async function deleteWheel(db, uid, wheelTitle) {
  const title = Util.sanitizeWheelTitle(wheelTitle);
  await db.doc(`accounts/${uid}/wheels/${title}`).delete();
}

export async function saveWheel(db, serverNow, uid, config) {
  // First create an account if there isn't one.
  await logUserActivity(db, serverNow, uid);
  config.title = Util.sanitizeWheelTitle(config.title);
  if (await wheelExists(db, uid, config.title)) {
    updateWheel(db, serverNow, uid, config);
  }
  else {
    createNewWheel(db, serverNow, uid, config);
  }
}

export async function deleteAccount(db, uid) {
  const batch = db.batch();
  const snap = await db.collection(`accounts/${uid}/wheels`).get();
  snap.forEach(function(doc) {
    batch.delete(doc.ref);
  })
  const doc = await db.doc(`accounts/${uid}`).get();
  batch.delete(doc.ref);
  await batch.commit();
}

async function wheelExists(db, uid, title) {
  const doc = await db.doc(`accounts/${uid}/wheels/${title}`).get();
  return doc.exists;
}

async function updateWheel(db, serverNow, uid, config) {
  const docRef = await db.doc(`accounts/${uid}/wheels/${config.title}`);
  const data = {
    config: config,
    lastWrite: serverNow,
  };
  await docRef.update(data);
}

async function createNewWheel(db, serverNow, uid, config) {
  const data = {
    config: config,
    created: serverNow,
    lastRead: null,
    lastWrite: serverNow,
    readCount: 0,
  };
  const docRef = await db.doc(`accounts/${uid}/wheels/${config.title}`);
  await docRef.set(data);
}

function alphabeticallyNonCaseSensitiveByTitle(a, b) {
  let titleA = a.title.toLowerCase();
  let titleB = b.title.toLowerCase();
  if (titleA < titleB) return -1;
  if (titleA > titleB) return 1;
  return 0;
}
