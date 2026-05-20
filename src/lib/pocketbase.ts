import PocketBase from 'pocketbase';

const url = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(url);

export const collectionName = import.meta.env.VITE_POCKETBASE_COLLECTION || 'profissionais_daps';

// Auth Admin
export async function authenticate() {
    if (pb.authStore.isValid) return; // Já autenticado
    try {
        // Tenta Admins (antigo) primeiro se falhar superusers
        try {
            await pb.admins.authWithPassword(
                import.meta.env.VITE_POCKETBASE_USER,
                import.meta.env.VITE_POCKETBASE_PASS,
                { requestKey: 'auth' }
            );
        } catch (e) {
            await pb.collection('_superusers').authWithPassword(
                import.meta.env.VITE_POCKETBASE_USER,
                import.meta.env.VITE_POCKETBASE_PASS,
                { requestKey: 'auth' }
            );
        }
        console.log('PocketBase Authenticated');
    } catch (error) {
        console.error('PocketBase Auth Error:', error);
    }
}

export default pb;