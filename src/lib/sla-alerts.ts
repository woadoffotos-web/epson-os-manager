export interface OsSlaAlerts {
  isOsNumberAlert: boolean;
  isDiagnosisAlert: boolean;
  isEmailSentAlert: boolean;
  isEmailReceivedAlert: boolean;
  isPartsOrderAlert: boolean;
  isPartsArrivalAlert: boolean;
  isRepairAlert: boolean;
  isNotice1Alert: boolean;
  isNotice2Alert: boolean;
  isNotice3Alert: boolean;
  isSystemExitAlert: boolean;
  isExitAlert: boolean;
  isFullRowAlert: boolean;
  fullRowReason?: '8D' | '27D';
}

/**
 * Calcula os dias de TMF (Tempo Médio de Fechamento / Turnaround Time).
 * - Se a OS tiver data de conserto (repairDate), calcula os dias corridos entre Entrada e Conserto.
 * - Se a OS ainda estiver em andamento (sem repairDate), calcula os dias corridos decorridos entre Entrada e a Data Atual.
 */
export function computeTmfDays(entryDate: Date | string, repairDate?: Date | string | null): number {
  if (!entryDate) return 0;
  const start = new Date(entryDate);
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());

  let endUtc: number;
  if (repairDate) {
    const end = new Date(repairDate);
    endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  } else {
    const today = new Date();
    endUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  }

  const diffDays = Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function getOsSlaAlerts(o: any): OsSlaAlerts {
  const alerts: OsSlaAlerts = {
    isOsNumberAlert: false,
    isDiagnosisAlert: false,
    isEmailSentAlert: false,
    isEmailReceivedAlert: false,
    isPartsOrderAlert: false,
    isPartsArrivalAlert: false,
    isRepairAlert: false,
    isNotice1Alert: false,
    isNotice2Alert: false,
    isNotice3Alert: false,
    isSystemExitAlert: false,
    isExitAlert: false,
    isFullRowAlert: false,
  };

  // Se a OS estiver cancelada/anulada ou já com ambas saídas concluídas, não aplica alertas
  if (o.situation?.isCanceled || (o.exitDate && o.systemExitDate)) {
    return alerts;
  }

  const today = new Date();

  const getDiffDays = (d: any) => {
    if (!d) return null;
    const dateObj = new Date(d);
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const targetUtc = Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate());
    return Math.floor((todayUtc - targetUtc) / (1000 * 60 * 60 * 24));
  };

  const diffEntry = getDiffDays(o.entryDate);
  const diffDiagnosis = getDiffDays(o.diagnosisDate);
  const diffEmailSent = getDiffDays(o.emailSentDate);
  const diffPartsOrder = getDiffDays(o.partsOrderDate);
  const diffPartsArrival = getDiffDays(o.partsArrivalDate);
  const diffRepair = getDiffDays(o.repairDate);
  const diffNotice1 = getDiffDays(o.notice1Date);
  const diffNotice2 = getDiffDays(o.notice2Date);

  // Verificação de datas posteriores à Entrada (da data de diagnóstico em diante):
  const hasDatesAfterEntry = Boolean(
    o.diagnosisDate ||
    o.emailSentDate ||
    o.emailReceivedDate ||
    o.partsOrderDate ||
    o.partsInvoiceDate ||
    o.partsArrivalDate ||
    o.repairDate ||
    o.notice1Date ||
    o.notice2Date ||
    o.notice3Date ||
    o.systemExitDate ||
    o.exitDate
  );

  // Verificação de datas posteriores ao Diagnóstico:
  const hasDatesAfterDiagnosis = Boolean(
    o.emailSentDate ||
    o.emailReceivedDate ||
    o.partsOrderDate ||
    o.partsInvoiceDate ||
    o.partsArrivalDate ||
    o.repairDate ||
    o.notice1Date ||
    o.notice2Date ||
    o.notice3Date ||
    o.systemExitDate ||
    o.exitDate
  );

  // Verificação de datas posteriores ao Email Enviado:
  const hasDatesAfterEmailSent = Boolean(
    o.emailReceivedDate ||
    o.partsOrderDate ||
    o.partsInvoiceDate ||
    o.partsArrivalDate ||
    o.repairDate ||
    o.notice1Date ||
    o.notice2Date ||
    o.notice3Date ||
    o.systemExitDate ||
    o.exitDate
  );

  // REGRA 1:
  // Se a diferença entre a data atual e a data de entrada for >= 2 e não tenha mais nenhuma outra data cadastrada nos campos de datas posteriores,
  // campo OS e data de diagnóstico avermelhados.
  if (diffEntry !== null && diffEntry >= 2 && !hasDatesAfterEntry) {
    alerts.isOsNumberAlert = true;
    alerts.isDiagnosisAlert = true;
  }

  // REGRA 2:
  // Se a diferença entre a data atual e a data de diagnóstico for >= 1 e não tenha mais nenhuma outra data cadastrada nos campos de datas posteriores,
  // campo OS e data de email enviado avermelhados.
  if (o.diagnosisDate && diffDiagnosis !== null && diffDiagnosis >= 1 && !hasDatesAfterDiagnosis) {
    alerts.isOsNumberAlert = true;
    alerts.isEmailSentAlert = true;
  }

  // REGRA 3:
  // Se a diferença entre a data atual e a data de email enviado (caso preenchida) for >= 1 e não tenha mais nenhuma outra data cadastrada nos campos de datas posteriores,
  // campo OS e data de email recebido avermelhados.
  if (o.emailSentDate && diffEmailSent !== null && diffEmailSent >= 1 && !hasDatesAfterEmailSent) {
    alerts.isOsNumberAlert = true;
    alerts.isEmailReceivedAlert = true;
  }

  // REGRA 4:
  // Se a diferença entre a data atual e a data de entrada for >= 4 e não tenha mais nenhuma outra data cadastrada nos campos de datas posteriores ao campo email enviado,
  // campo OS e data de pedido de peça avermelhados.
  if (diffEntry !== null && diffEntry >= 4 && !hasDatesAfterEmailSent) {
    alerts.isOsNumberAlert = true;
    alerts.isPartsOrderAlert = true;
  }

  // REGRA 5 / REGRA 8:
  // Se a diferença entre a data atual e a data de entrada for >= 2 e não tenha data cadastrada no campo pedido de peça,
  // campo OS e data de conserto avermelhados. (caso ainda não consertado)
  if (diffEntry !== null && diffEntry >= 2 && !o.partsOrderDate && !o.repairDate) {
    alerts.isOsNumberAlert = true;
    alerts.isRepairAlert = true;
  }

  // REGRA 6:
  // Se a diferença entre a data atual e a data de pedido peça for >= 2 e não tenha data cadastrada no campo chegada,
  // campo OS e data de chegada avermelhados.
  if (o.partsOrderDate && diffPartsOrder !== null && diffPartsOrder >= 2 && !o.partsArrivalDate) {
    alerts.isOsNumberAlert = true;
    alerts.isPartsArrivalAlert = true;
  }

  // REGRA 7:
  // Se a diferença entre a data atual e a data de chegada for >= 2 e não tenha data cadastrada no campo conserto,
  // campo OS e data de conserto avermelhados.
  if (o.partsArrivalDate && diffPartsArrival !== null && diffPartsArrival >= 2 && !o.repairDate) {
    alerts.isOsNumberAlert = true;
    alerts.isRepairAlert = true;
  }

  // REGRA 9:
  // Se a diferença entre a data atual e a data de entrada for >= 8 e não tenha data cadastrada no campo conserto,
  // toda a linha onde está preenchida a ordem de serviço e a data de conserto ficarão com um tom avermelhado.
  if (diffEntry !== null && diffEntry >= 8 && !o.repairDate) {
    alerts.isFullRowAlert = true;
    if (!alerts.fullRowReason) {
      alerts.fullRowReason = '8D';
    }
    alerts.isOsNumberAlert = true;
    alerts.isRepairAlert = true;
  }

  // REGRA 10:
  // Se a diferença entre a data atual e a data de conserto for >= 1 e não tenha data cadastrada no campo 1º aviso,
  // e o campo saída está sem data preenchida, campo OS e data de 1º Aviso avermelhados.
  if (o.repairDate && diffRepair !== null && diffRepair >= 1 && !o.notice1Date && !o.exitDate && !o.systemExitDate) {
    alerts.isOsNumberAlert = true;
    alerts.isNotice1Alert = true;
  }

  // REGRA 11:
  // Se a diferença entre a data atual e a data de 1º aviso for >= 1 e não tenha data cadastrada no campo 2º aviso,
  // e o campo saída está sem data preenchida, campo OS e data de 2º Aviso avermelhados.
  if (o.notice1Date && diffNotice1 !== null && diffNotice1 >= 1 && !o.notice2Date && !o.exitDate && !o.systemExitDate) {
    alerts.isOsNumberAlert = true;
    alerts.isNotice2Alert = true;
  }

  // REGRA 12:
  // Se a diferença entre a data atual e a data de 2º aviso for >= 1 e não tenha data cadastrada no campo 3º aviso,
  // e o campo saída está sem data preenchida, campo OS e data de aviso avermelhados.
  if (o.notice2Date && diffNotice2 !== null && diffNotice2 >= 1 && !o.notice3Date && !o.exitDate && !o.systemExitDate) {
    alerts.isOsNumberAlert = true;
    alerts.isNotice2Alert = true;
    alerts.isNotice3Alert = true;
  }

  // REGRA 13:
  // Se a diferença entre a data atual e a data de entrada for >= 27 e não tenha data cadastrada no campo Saída sistema,
  // toda a linha onde está preenchida a ordem de serviço e a data de conserto ficarão com um tom avermelhado.
  if (diffEntry !== null && diffEntry >= 27 && !o.systemExitDate) {
    alerts.isFullRowAlert = true;
    alerts.fullRowReason = '27D';
    alerts.isOsNumberAlert = true;
    alerts.isRepairAlert = true;
    alerts.isSystemExitAlert = true;
  }

  // REGRA 14:
  // Se o campo saída do sistema está preenchido e o campo saída física está sem preencher,
  // o campo onde está preenchida a ordem de serviço e a data de saída física ficarão com um tom avermelhado.
  if (o.systemExitDate && !o.exitDate) {
    alerts.isOsNumberAlert = true;
    alerts.isExitAlert = true;
  }

  return alerts;
}
