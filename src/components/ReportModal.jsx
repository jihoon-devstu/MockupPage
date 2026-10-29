import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Modal } from './ui';
import { OpenChatButton } from './Chat';
import { REPORT_REASONS } from '../data/reports';
import { CHAT_ME } from '../data/chats';

/* 신고 모달 — 실제 구현 features/report/components/ReportModal 과 같은 구성. 리뷰 · 회원 신고에 공용
   사용: <ReportModal target={{ type: 'REVIEW', id: 31, label: '리뷰' }} onClose={() => setTarget(null)} />  — target 이 있으면 열림
   목업: 접수하면 신고 번호만 만들어 접수 완료 화면을 보여 준다 */
let seq = 900;

export default function ReportModal({ target, onClose }) {
  if (!target) return null;
  return <ReportForm key={`${target.type}-${target.id}`} target={target} onClose={onClose} />; // key: 대상이 바뀌면 입력 초기화
}

function ReportForm({ target, onClose }) {
  const reasons = REPORT_REASONS[target.type];
  const [reasonCode, setReasonCode] = useState(reasons[0].code);
  const [detail, setDetail] = useState('');
  const [reportId, setReportId] = useState(null);

  if (reportId) return <ReportDone reportId={reportId} onClose={onClose} />;
  return (
    <Modal open onClose={onClose} title={`${target.label ?? (target.type === 'USER' ? '회원' : '리뷰')} 신고`} width={440}
      footer={<><button className="btn btn-line btn-sm" onClick={onClose}>취소</button><button className="btn btn-ink btn-sm" onClick={() => setReportId(++seq)}>신고하기</button></>}>
      <label className="label">신고 사유</label>
      <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="field mb-3">
        {reasons.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
      </select>
      <textarea rows={3} maxLength={500} value={detail} onChange={(e) => setDetail(e.target.value)} className="field" placeholder="자세한 내용 (선택, 500자 이하)" />
      <p className="text-[12px] text-mute mt-2">허위 신고가 반복되면 이용이 제한될 수 있어요. 같은 대상은 한 번만 신고할 수 있습니다.</p>
    </Modal>
  );
}

/** 접수 완료 — 처리 상황은 운영팀 상담방에 이 신고 카드를 붙여 물어본다 (판매자센터에서 신고했으면 판매자 운영 상담) */
function ReportDone({ reportId, onClose }) {
  const seller = useLocation().pathname.startsWith('/seller');
  return (
    <Modal open onClose={onClose} title="신고 접수 완료" width={440}
      footer={<>
        <button className="btn btn-line btn-sm" onClick={onClose}>닫기</button>
        <OpenChatButton className="btn btn-ink btn-sm" basePath={seller ? '/seller/chats' : '/mypage/chats'} by={seller ? 'SELLER' : 'BUYER'}
          request={seller
            ? { type: 'SELLER_SUPPORT', storeId: CHAT_ME.storeId, context: { type: 'REPORT', id: reportId } }
            : { type: 'BUYER_SUPPORT', buyerId: CHAT_ME.userId, context: { type: 'REPORT', id: reportId } }}>
          운영팀에 처리 문의
        </OpenChatButton>
      </>}>
      <p className="text-[14px]">신고를 접수했어요. 운영팀이 확인 후 조치합니다.</p>
      <p className="text-[12.5px] text-mute mt-1.5">처리 상황이 궁금하면 운영팀에 바로 물어볼 수 있어요. 이 신고 내용이 대화에 함께 붙습니다.</p>
    </Modal>
  );
}
