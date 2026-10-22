/**
 * Aparece quando uma ação precisa de assinatura e a chave da conta não está carregada
 * (ver assinarAcao em sessao.js). Fica montado no App, por cima de qualquer tela.
 */

import { KeyRound } from "lucide-react";
import CarregarChave from "./CarregarChave";
import JanelaChave from "./JanelaChave";
import { impressaoDigital } from "./cripto";
import { cancelarPedido, concluirPedido, usePedidoChave } from "./sessao";

export default function PedidoChaveModal() {
  const pedido = usePedidoChave();
  if (!pedido) return null;

  return (
    <JanelaChave titulo="Assine com sua chave digital" icone={KeyRound} onFechar={cancelarPedido}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Sua conta usa chave digital: esta operação só vale assinada por ela. Carregue a chave{" "}
          <strong className="font-mono text-slate-700">{impressaoDigital(pedido.chavePublica)}</strong>. Ela fica
          carregada até você sair ou recarregar a página.
        </p>
        <CarregarChave
          vaga="usuario"
          dono={pedido.dono}
          esperada={pedido.chavePublica}
          rotuloBotao="Carregar e assinar"
          onCarregada={concluirPedido}
        />
      </div>
    </JanelaChave>
  );
}
