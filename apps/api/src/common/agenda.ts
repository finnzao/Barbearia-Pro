/**
 * A agenda inteira trabalha em blocos de 30 min: é o passo da grade oferecida ao
 * cliente e o múltiplo exigido na duração dos serviços. Um serviço de 20 ou 50
 * min desalinharia a grade e deixaria buracos impossíveis de vender.
 *
 * A grade (publico.service) e a validação (criar-servico.dto) leem daqui para
 * não divergirem.
 */
export const PASSO_MIN = 30;
