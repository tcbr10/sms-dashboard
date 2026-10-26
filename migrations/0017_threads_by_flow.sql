-- Exporting a flow's chats reads its threads in id order.
CREATE INDEX idx_bot_threads_flow ON bot_threads(flow_id, id);
