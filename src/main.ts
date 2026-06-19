import './style.css';
import './components/app-root';
import { store } from './state/store';
import { isFirebaseConfigured } from './firebase/config';
import { showToast } from './utils/toast';

// Inicializa a sincronização com o Firebase (auth + dados) apenas se
// as credenciais estiverem presentes.
if (isFirebaseConfigured) {
  store.init();
}

// Feedback de reconexão/queda de rede.
window.addEventListener('offline', () =>
  showToast('Você está offline. Exibindo dados em cache.', 'info', 4000)
);
window.addEventListener('online', () =>
  showToast('Conexão restabelecida.', 'success', 2500)
);
