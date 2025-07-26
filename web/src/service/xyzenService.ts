// import {
//   Assistant,
//   ChatData,
//   Message,
//   SendMessageParams,
// } from '@/@types/xyzen';
// import { AppDispatch, RootState, useAppDispatch } from '@/app/store';
// import { BASE_URL, WS_URL } from '@/config';
// import { getAssistantPromptById } from '@/config/assistants';
// import createAxiosWithInterceptors from '@/helpers/jwtinterceptor';
// import {
//   createChatThunk,
//   fetchAssistantsThunk,
//   fetchChatHistoryThunk,
//   togglePinChat as togglePinChatAction,
// } from '@/store/xyzen/xyzenMiddleware';
// import {
//   addMessage,
//   setActiveChannelUUID,
//   setChannelConnected,
//   setChannelError,
//   setView,
// } from '@/store/xyzen/xyzenSlice';
// import { eventBus } from '@/utils/eventBus';
// import { useCallback, useEffect, useRef } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { v4 as uuidv4 } from 'uuid';

// // WebSocket连接接口
// export interface WebSocketConnection {
//   socket: WebSocket;
//   channelUUID: string;
//   reconnectAttempts: number;
//   reconnectTimeout: NodeJS.Timeout | null;
//   reconnecting: boolean;
// }

// // 重连配置
// const MAX_RECONNECT_ATTEMPTS = 5;
// const RECONNECT_INTERVAL = 3000; // 3秒

// // 存储活跃的WebSocket连接 - 现在只会存储一个活跃连接
// let activeConnection: WebSocketConnection | null = null;

// // 用来保存最后请求的key名
// let lastRequestedKey: string | null = null;

// // 提取请求中的key名
// function extractKeyNameFromRequest(message: string): string | null {
//   if (message.includes('请帮我生成') && message.includes('schema')) {
//     const keyMatch = message.match(/生成\s*(\S+)\s*的\s*schema/i);
//     if (keyMatch && keyMatch[1]) {
//       return keyMatch[1];
//     }
//   }
//   return null;
// }

// /**
//  * useXyzenService - React hook to interact with Xyzen backend services
//  * 封装了与Xyzen助手、聊天和WebSocket相关的所有交互逻辑
//  */
// export const useXyzenService = () => {
//   const dispatch = useAppDispatch();
//   const { activeChannelUUID, assistants, user, channels } = useSelector(
//     (state: RootState) => state.xyzen,
//   );

//   // 使用ref跟踪活跃连接，避免频繁触发effect
//   const activeConnectionRef = useRef<string | null>(null);

//   /**
//    * 获取可用助手列表
//    * @returns 助手列表
//    */
//   const fetchAssistantsAPI = async (): Promise<Assistant[]> => {
//     try {
//       const jwtAxios = createAxiosWithInterceptors();
//       const response = await jwtAxios.get(`${BASE_URL}/xyzen/assistants/`);

//       // 将后端数据转换为前端 Assistant 格式
//       return response.data.map((item: any) => ({
//         id: item.id,
//         title: item.title,
//         description: item.description,
//         iconType: item.icon_type || 'DocumentText',
//         iconColor: item.icon_color || 'blue',
//         category: item.category || '通用',
//         assistantId: item.id, // 保存原始助手ID
//       }));
//     } catch (error) {
//       console.error('Error fetching assistants:', error);
//       return [];
//     }
//   };

//   /**
//    * 获取用户聊天会话列表
//    * @returns 聊天会话列表
//    */
//   const fetchChats = async (): Promise<ChatData[]> => {
//     try {
//       const jwtAxios = createAxiosWithInterceptors();
//       const response = await jwtAxios.get(`${BASE_URL}/xyzen/chats/`);
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching chats:', error);
//       return [];
//     }
//   };

//   /**
//    * 获取特定聊天会话的详情，包括消息历史
//    * @param chatId 聊天会话 ID
//    * @param userAvatar 当前用户头像，用于消息显示
//    * @returns 聊天会话详情和消息历史
//    */
//   const fetchChatDetails = async (
//     chatId: string,
//     userAvatar: string = '/default-avatar.png',
//   ): Promise<{ chat: ChatData; messages: Message[] }> => {
//     try {
//       const jwtAxios = createAxiosWithInterceptors();
//       const response = await jwtAxios.get(`${BASE_URL}/xyzen/chat/${chatId}/`);

//       // 将后端消息格式转换为前端格式
//       const messages: Message[] = response.data.messages.map((msg: any) => ({
//         id: msg.id,
//         sender: msg.sender_username,
//         content: msg.content,
//         timestamp: msg.timestamp,
//         avatar: msg.avatar || (msg.is_ai ? '/AI.png' : userAvatar),
//         isCurrentUser: !msg.is_ai,
//       }));

//       return {
//         chat: {
//           id: response.data.id,
//           title: response.data.title,
//           assistant: response.data.assistant,
//           assistant_name: response.data.assistant_name,
//           messages_count: response.data.messages_count,
//           created_at: response.data.created_at,
//           updated_at: response.data.updated_at,
//           is_pinned: response.data.is_pinned,
//         },
//         messages,
//       };
//     } catch (error) {
//       console.error(`Error fetching chat details for ${chatId}:`, error);
//       throw error;
//     }
//   };

//   /**
//    * 创建新的聊天会话（直接API调用）
//    * @param uuid 聊天UUID
//    * @param assistantId 助手ID（可选）
//    * @param title 聊天标题
//    * @returns 新创建的聊天会话
//    */
//   const createChatAPI = async (
//     uuid: string,
//     assistantId?: string,
//     title: string = '新对话',
//   ): Promise<ChatData> => {
//     try {
//       const jwtAxios = createAxiosWithInterceptors();
//       const payload = {
//         uuid,
//         assistant_id: assistantId,
//         title,
//       };

//       const response = await jwtAxios.post(
//         `${BASE_URL}/xyzen/chat/create_with_uuid/`,
//         payload,
//       );
//       return response.data;
//     } catch (error) {
//       console.error('Error creating chat:', error);
//       throw error;
//     }
//   };

//   /**
//    * 重命名聊天会话
//    * @param chatId 聊天ID
//    * @param newTitle 新标题
//    */
//   const renameChat = async (
//     chatId: string,
//     newTitle: string,
//   ): Promise<ChatData> => {
//     try {
//       const jwtAxios = createAxiosWithInterceptors();
//       const response = await jwtAxios.post(
//         `${BASE_URL}/xyzen/chat/${chatId}/rename/`,
//         {
//           title: newTitle,
//         },
//       );
//       return response.data;
//     } catch (error) {
//       console.error('Error renaming chat:', error);
//       throw error;
//     }
//   };

//   /**
//    * 删除聊天会话
//    * @param chatId 聊天ID
//    */
//   const deleteChat = async (chatId: string): Promise<void> => {
//     try {
//       const jwtAxios = createAxiosWithInterceptors();
//       await jwtAxios.delete(`${BASE_URL}/xyzen/chat/${chatId}/`);
//     } catch (error) {
//       console.error('Error deleting chat:', error);
//       throw error;
//     }
//   };

//   /**
//    * 清除聊天会话中的所有消息
//    * @param chatId 聊天ID
//    */
//   const clearChatMessages = async (chatId: string): Promise<void> => {
//     try {
//       const jwtAxios = createAxiosWithInterceptors();
//       await jwtAxios.post(`${BASE_URL}/xyzen/chat/${chatId}/clear_messages/`);
//     } catch (error) {
//       console.error('Error clearing chat messages:', error);
//       throw error;
//     }
//   };

//   /**
//    * 切换聊天会话置顶状态 (API直接调用)
//    * @param chatId 聊天ID
//    */
//   const togglePinChatAPI = async (
//     chatId: string,
//   ): Promise<{ is_pinned: boolean }> => {
//     try {
//       const jwtAxios = createAxiosWithInterceptors();
//       const response = await jwtAxios.post(
//         `${BASE_URL}/xyzen/chat/${chatId}/pin/`,
//       );
//       return response.data;
//     } catch (error) {
//       console.error('Error toggling chat pin status:', error);
//       throw error;
//     }
//   };

//   /**
//    * 获取特定助手的会话列表
//    * @param assistantId 助手ID
//    */
//   const fetchAssistantChats = async (
//     assistantId: string,
//   ): Promise<ChatData[]> => {
//     try {
//       const jwtAxios = createAxiosWithInterceptors();
//       const response = await jwtAxios.get(
//         `${BASE_URL}/xyzen/chats/by-assistant/${assistantId}/`,
//       );
//       return response.data;
//     } catch (error) {
//       console.error(
//         `Error fetching chats for assistant ${assistantId}:`,
//         error,
//       );
//       return [];
//     }
//   };

//   /**
//    * 清理当前WebSocket连接
//    */
//   const cleanupConnection = useCallback(() => {
//     if (activeConnection) {
//       if (activeConnection.socket) {
//         activeConnection.socket.close();
//       }
//       if (activeConnection.reconnectTimeout) {
//         clearTimeout(activeConnection.reconnectTimeout);
//       }
//       activeConnection = null;
//       activeConnectionRef.current = null;
//     }
//   }, []);

//   /**
//    * 创建新的WebSocket连接
//    * @param channelUUID 频道ID
//    */
//   const createWebSocketConnection = useCallback(
//     (channelUUID: string) => {
//       if (!channelUUID) return null;

//       const wsUrl = `${WS_URL}/ws/chat/${channelUUID}/`;

//       try {
//         const socket = new WebSocket(wsUrl);

//         const connection: WebSocketConnection = {
//           socket,
//           channelUUID,
//           reconnectAttempts: 0,
//           reconnectTimeout: null,
//           reconnecting: false,
//         };

//         // 设置事件处理程序
//         socket.onopen = () => {
//           console.log(`WebSocket connected for channel ${channelUUID}`);
//           dispatch(
//             setChannelConnected({
//               channelUUID,
//               connected: true,
//             }),
//           );
//           connection.reconnectAttempts = 0;

//           // 查找与此channelUUID关联的助手
//           const assistant = assistants.find(
//             (a) => a.id === channelUUID || a.id === channelUUID,
//           );

//           // 如果找到助手，发送系统提示
//           if (assistant) {
//             // 获取助手的系统提示 - 只是为了前端知道已经发送了提示
//             const systemPrompt = getAssistantPromptById(assistant.id);

//             // 发送系统提示到后端
//             if (systemPrompt) {
//               socket.send(
//                 JSON.stringify({
//                   type: 'system_prompt',
//                   prompt: 'init', // 只发送初始化信号
//                   assistant_id: assistant.id, // 传递助手ID给后端
//                 }),
//               );
//               console.log(
//                 `System prompt initialization sent for assistant: ${assistant.title}`,
//               );
//             }
//           }
//         };

//         socket.onmessage = (event) => {
//           try {
//             const data = JSON.parse(event.data);
//             if (data.new_message) {
//               // 检查是否是来自Schema助手的响应，可能包含JSON Schema
//               if (
//                 data.new_message.is_ai &&
//                 data.new_message.content.trim().startsWith('{') &&
//                 data.new_message.content.trim().endsWith('}')
//               ) {
//                 try {
//                   // 尝试解析消息内容为JSON
//                   const parsedSchema = JSON.parse(
//                     data.new_message.content.trim(),
//                   );

//                   // 检查这是否确实是一个Schema (简单检查是否有type字段)
//                   if (parsedSchema.type && parsedSchema.properties) {
//                     console.log('Received valid JSON Schema:', parsedSchema);

//                     // 发布事件，通知相关组件处理Schema
//                     eventBus.publish('schema:generated', {
//                       schema: parsedSchema,
//                       originalMessage: data.new_message.content,
//                       // 从请求中获取key名
//                       keyName: lastRequestedKey,
//                     });
//                   }
//                 } catch (jsonError) {
//                   // 非JSON内容，正常处理
//                   console.log('Message is not a valid JSON');
//                 }
//               }

//               // 处理头像URL
//               const processAvatar = (avatarUrl: string | undefined) => {
//                 if (!avatarUrl) return undefined;
//                 return avatarUrl;
//               };

//               // 获取处理后的头像URL
//               const messageAvatar = processAvatar(data.new_message.avatar);

//               // 创建消息对象并调用回调
//               const message: Message = {
//                 id: data.new_message.id || `server-${Date.now()}`,
//                 sender: data.new_message.sender,
//                 content: data.new_message.content,
//                 timestamp: data.new_message.timestamp,
//                 avatar: messageAvatar || '/AI.png',
//                 isCurrentUser: false,
//               };

//               dispatch(
//                 addMessage({
//                   channelUUID,
//                   message,
//                 } as any),
//               );
//             } else if (data.error) {
//               dispatch(
//                 setChannelError({
//                   channelUUID,
//                   error: data.error,
//                 }),
//               );
//             }
//           } catch (e) {
//             console.error('Failed to parse message', e);
//             dispatch(
//               setChannelError({
//                 channelUUID,
//                 error: '消息解析错误',
//               }),
//             );
//           }
//         };

//         socket.onerror = (event) => {
//           console.error(`WebSocket error for channel ${channelUUID}`, event);
//           dispatch(
//             setChannelError({
//               channelUUID,
//               error: '连接出错，尝试重新连接中...',
//             }),
//           );
//           dispatch(
//             setChannelConnected({
//               channelUUID,
//               connected: false,
//             }),
//           );
//         };

//         socket.onclose = (event) => {
//           console.log(`WebSocket closed for channel ${channelUUID}`, event);
//           dispatch(
//             setChannelConnected({
//               channelUUID,
//               connected: false,
//             }),
//           );

//           // 非正常关闭，尝试重连
//           if (
//             event.code !== 1000 &&
//             !connection.reconnecting &&
//             connection.reconnectAttempts < MAX_RECONNECT_ATTEMPTS &&
//             channelUUID === activeChannelUUID // 只有当前活跃的channel才尝试重连
//           ) {
//             connection.reconnecting = true;
//             connection.reconnectTimeout = setTimeout(() => {
//               connection.reconnectAttempts += 1;
//               dispatch(
//                 setChannelError({
//                   channelUUID,
//                   error: `连接已断开，正在尝试重新连接 (${connection.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
//                 }),
//               );
//               // 只在当前channelUUID还是活跃的情况下重连
//               if (channelUUID === activeChannelUUID) {
//                 setActiveChannel(channelUUID);
//               }
//             }, RECONNECT_INTERVAL);
//           } else if (connection.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
//             dispatch(
//               setChannelError({
//                 channelUUID,
//                 error: '无法建立连接，请检查网络或刷新页面重试',
//               }),
//             );
//           }
//         };

//         // 保存连接
//         activeConnection = connection;
//         activeConnectionRef.current = channelUUID;

//         return connection;
//       } catch (error) {
//         console.error(
//           `Failed to create WebSocket for channel ${channelUUID}`,
//           error,
//         );
//         dispatch(
//           setChannelError({
//             channelUUID,
//             error: '无法创建连接，请检查网络或刷新页面重试',
//           }),
//         );
//         return null;
//       }
//     },
//     [activeChannelUUID, assistants, dispatch],
//   );

//   /**
//    * 发送消息到WebSocket
//    * @param params 发送消息的参数
//    */
//   const sendMessage = useCallback(
//     (params: SendMessageParams) => {
//       const { channelUUID, message, context } = params;

//       // 提取并保存请求中的key名
//       const keyName = extractKeyNameFromRequest(message);
//       if (keyName) {
//         lastRequestedKey = keyName;
//         console.log('Detected key name request:', lastRequestedKey);
//       }

//       // 确保连接存在
//       if (
//         activeConnection &&
//         activeConnection.socket.readyState === WebSocket.OPEN &&
//         activeConnection.channelUUID === channelUUID
//       ) {
//         try {
//           // 添加本地消息预览
//           if (!context || !context.hidePreview) {
//             // 生成一个临时ID用于消息预览
//             const userMessageId = Date.now().toString();
//             const localMessage: Message = {
//               id: userMessageId,
//               sender: user.username,
//               content: message,
//               timestamp: new Date().toISOString(),
//               avatar: user.avatar,
//               isCurrentUser: true,
//             };
//             dispatch(
//               addMessage({
//                 channelUUID,
//                 message: localMessage,
//               } as any),
//             );
//           }

//           // 发送消息和上下文到后端
//           activeConnection.socket.send(
//             JSON.stringify({
//               message: message,
//               context: context || {}, // 确保即使没有上下文也发送空对象
//               // assistant_id: assistant?.id || null, // 发送助手ID，让后端可以识别是哪个助手
//             }),
//           );

//           return true;
//         } catch (error) {
//           console.error(
//             `Failed to send message to channel ${channelUUID}`,
//             error,
//           );
//           return false;
//         }
//       } else {
//         console.warn(
//           `Cannot send message - connection not ready for channel ${channelUUID}`,
//         );

//         // 如果连接不存在或已关闭，尝试重新建立连接
//         if (channelUUID === activeChannelUUID) {
//           setActiveChannel(channelUUID);
//         }

//         return false;
//       }
//     },
//     [assistants, dispatch, user, activeChannelUUID],
//   );

//   // 使用Redux中的thunk加载助手列表
//   const fetchAssistants = useCallback(() => {
//     return dispatch(fetchAssistantsThunk());
//   }, [dispatch]);

//   // 加载聊天历史
//   const fetchChatHistory = useCallback(() => {
//     return dispatch(fetchChatHistoryThunk());
//   }, [dispatch]);

//   // 创建聊天会话
//   const createChat = useCallback(
//     async (assistantId?: string, title = '默认话题') => {
//       const uuid = uuidv4();
//       try {
//         await dispatch(
//           createChatThunk({
//             uuid,
//             assistantId,
//             title,
//           }),
//         );

//         return uuid
//       } catch (error) {
//         console.error('Failed to create chat:', error);
//         return null;
//       }
//     },
//     [],
//   );

//   // 切换会话置顶状态
//   const togglePinChat = useCallback(
//     (chatId: string) => {
//       return dispatch(togglePinChatAction(chatId));
//     },
//     [dispatch],
//   );

//   // 设置活跃频道 - 现在是WebSocket连接管理的唯一入口点
//   const setActiveChannel = useCallback((channelUUID: string | null) => {
//     // 首先清除现有连接
//     cleanupConnection();

//     // 更新Redux状态
//     dispatch(setActiveChannelUUID(channelUUID));

//     // 如果有新的channelUUID，建立新连接
//     if (channelUUID) {
//       createWebSocketConnection(channelUUID);
//     }
//   }, []);

//   // 创建新的默认频道
//   const createDefaultChannel = useCallback(
//     async (assistantId?: string) => {
//       const uuid = await createChat(assistantId);
//       if (uuid) {
//         setActiveChannel(uuid);
//         dispatch(setView('chat'));
//         return uuid;
//       }
//       return null;
//     },
//     [createChat, setActiveChannel],
//   );

//   /**
//    * 获取WebSocket连接状态
//    * @param channelUUID 频道ID
//    * @returns 连接状态，如果不存在返回false
//    */
//   const isConnected = useCallback((channelUUID: string): boolean => {
//     return !!(
//       activeConnection &&
//       activeConnection.channelUUID === channelUUID &&
//       activeConnection.socket &&
//       activeConnection.socket.readyState === WebSocket.OPEN
//     );
//   }, []);


//   return {
//     // 助手相关
//     fetchAssistants,
//     assistants,

//     // 聊天会话相关
//     fetchChatHistory,
//     createChat,
//     togglePinChat,

//     // 额外API方法（可以按需使用）
//     fetchChats,
//     fetchChatDetails,
//     renameChat,
//     deleteChat,
//     clearChatMessages,
//     fetchAssistantChats,

//     // WebSocket相关
//     sendMessage,
//     setActiveChannel,
//     createDefaultChannel,

//     // 工具方法
//     isConnected,
//   };
// };

// export default useXyzenService;
