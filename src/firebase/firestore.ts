import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import type { Refueling, RefuelingInput, Vehicle } from '../types';

/**
 * Estrutura de dados no Firestore:
 *
 *   users/{uid}                       -> documento com o veículo (1 por usuário)
 *   users/{uid}/refuelings/{autoId}   -> registros de abastecimento
 *
 * As regras de segurança (firestore.rules) garantem que cada usuário só
 * acessa os próprios documentos.
 */

function userDoc(uid: string) {
  return doc(db, 'users', uid);
}

function refuelingsCol(uid: string) {
  return collection(db, 'users', uid, 'refuelings');
}

/* ----------------------------- Veículo ----------------------------- */

/** Observa o veículo do usuário em tempo real. */
export function observeVehicle(
  uid: string,
  callback: (vehicle: Vehicle | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    userDoc(uid),
    (snap) => {
      const data = snap.data();
      callback((data?.vehicle as Vehicle) ?? null);
    },
    (err) => onError?.(err)
  );
}

/** Cria ou atualiza o veículo do usuário (merge para não apagar outros campos). */
export async function saveVehicle(uid: string, vehicle: Vehicle): Promise<void> {
  await setDoc(
    userDoc(uid),
    { vehicle: { ...vehicle, updatedAt: Date.now() } },
    { merge: true }
  );
}

/**
 * Exclui o veículo e TODOS os abastecimentos do usuário, de forma atômica.
 * Remove apenas o campo `vehicle` (preservando o documento do usuário) e
 * apaga cada registro da subcoleção em um único lote (writeBatch).
 *
 * Observação: o lote suporta até 500 operações. Para o uso desta aplicação
 * (um veículo por usuário) o número de abastecimentos fica bem abaixo disso.
 */
export async function deleteVehicle(uid: string): Promise<void> {
  const snap = await getDocs(refuelingsCol(uid));
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(d.ref));
  // `set` com merge (em vez de `update`) não falha caso o documento do
  // usuário não exista — apenas remove o campo `vehicle` se ele estiver lá.
  batch.set(userDoc(uid), { vehicle: deleteField() }, { merge: true });
  await batch.commit();
}

/* -------------------------- Abastecimentos -------------------------- */

/** Observa a lista de abastecimentos (ordenada por data desc). */
export function observeRefuelings(
  uid: string,
  callback: (items: Refueling[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(refuelingsCol(uid), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items: Refueling[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Refueling, 'id'>),
      }));
      callback(items);
    },
    (err) => onError?.(err)
  );
}

export async function addRefueling(
  uid: string,
  input: RefuelingInput
): Promise<void> {
  await addDoc(refuelingsCol(uid), {
    ...input,
    createdAt: Date.now(),
  });
}

export async function updateRefueling(
  uid: string,
  id: string,
  input: RefuelingInput
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'refuelings', id), { ...input });
}

export async function deleteRefueling(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'refuelings', id));
}
