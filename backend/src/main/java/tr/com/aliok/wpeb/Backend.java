package tr.com.aliok.wpeb;

import com.google.protobuf.InvalidProtocolBufferException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tr.com.aliok.wpeb.protocol.Protocol;

import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * @author Ali Ok (ali.ok@apache.org)
 *         11/08/2015 23:58
 */
@ServerEndpoint(value = "/backend")
public class Backend {
    private static final String ATTR_KEY_USERNAME = "ATTR_KEY_USERNAME";

    private static final Logger LOG = LoggerFactory.getLogger(Backend.class);

    // Backend class is stateless. that's why following two are static
    // in production code, you'd inject state!
    private static final Set<Session> sessions = Collections.synchronizedSet(new HashSet<Session>());
    private static final AtomicInteger indexOfLastUser = new AtomicInteger(0);


    @OnOpen
    public void onOpen(Session session) {
        sessions.add(session);
        LOG.info("Connected: " + session.getId() + ". Number of sessions : " + sessions.size());

        final int userIndex = indexOfLastUser.getAndIncrement();
        final String userName = "User #" + userIndex;
        session.getUserProperties().put(ATTR_KEY_USERNAME, userName);

        final Protocol.CommandAuthorization commandAuthorization = Protocol.CommandAuthorization.newBuilder()
                .setActionType(Protocol.ActionType.USER_JOIN)
                .setTime(System.currentTimeMillis())
                .setUserName(userName)
                .setUserJoinAction(Protocol.UserJoinAction.newBuilder().setUserCount(sessions.size()))
                .build();

        this.sendBinaryMessageToAll(commandAuthorization);
    }

    @OnMessage
    public void onTextMessage(String message, Session session) {
        LOG.info("Text message from " + session.getId() + " : " + message);
    }

    @OnMessage
    public void onBinaryMessage(ByteBuffer byteBuffer, Session session) {
        LOG.info("Binary Message from " + session.getId() + " : " + byteBuffer);
        final Protocol.CommandRequest commandRequest;
        try {
            commandRequest = Protocol.CommandRequest.parseFrom(byteBuffer.array());
        } catch (InvalidProtocolBufferException e) {
            LOG.error("Received a corrupt binary message: " + byteBuffer, e);
            return;
        }

        final Protocol.ActionType actionType = commandRequest.getActionType();
        if (actionType == null) {
            LOG.error("Action type is null for received binary message! Ignoring it.");
            return;
        }

        final String userName = (String) session.getUserProperties().get(ATTR_KEY_USERNAME);
        final Protocol.CommandAuthorization.Builder builder = Protocol.CommandAuthorization.newBuilder();
        builder.setTime(System.currentTimeMillis()).setUserName(userName);

        switch (actionType) {
            case ORDER_PIZZA: {
                final Protocol.CommandAuthorization commandAuthorization = builder
                        .setActionType(Protocol.ActionType.ORDER_PIZZA)
                        .setOrderPizzaAction(commandRequest.getOrderPizzaAction())
                        .build();
                this.sendBinaryMessageToAll(commandAuthorization);
                break;
            }
            case PLAY_VIDEO_GAME: {
                final Protocol.CommandAuthorization commandAuthorization = builder
                        .setActionType(Protocol.ActionType.PLAY_VIDEO_GAME)
                        .setPlayVideoGameAction(commandRequest.getPlayVideoGameAction())
                        .build();
                this.sendBinaryMessageToAll(commandAuthorization);
                break;
            }
            case DRINK_TEA: {
                final Protocol.CommandAuthorization commandAuthorization = builder
                        .setActionType(Protocol.ActionType.DRINK_TEA)
                        .setDrinkTeaAction(commandRequest.getDrinkTeaAction())
                        .build();
                this.sendBinaryMessageToAll(commandAuthorization);
                break;
            }
            default: {
                LOG.error("Unknown action type " + actionType);
                return;
            }
        }
    }

    @OnClose
    public void onClose(Session session) {
        sessions.remove(session);
        LOG.info("Left: " + session.getId() + ". Number of remaining sessions : " + sessions.size());

        final String userName = (String) session.getUserProperties().get(ATTR_KEY_USERNAME);
        final Protocol.CommandAuthorization commandAuthorization = Protocol.CommandAuthorization.newBuilder()
                .setActionType(Protocol.ActionType.USER_LEAVE)
                .setTime(System.currentTimeMillis())
                .setUserName(userName)
                .setUserLeaveAction(Protocol.UserLeaveAction.newBuilder().setUserCount(sessions.size()))
                .build();

        sendBinaryMessageToAll(commandAuthorization);
    }

    private void sendBinaryMessageToAll(Protocol.CommandAuthorization commandAuthorization) {
        for (Session session : sessions) {
            this.sendBinaryMessage(session, commandAuthorization);
        }
    }

    private void sendBinaryMessage(Session session, Protocol.CommandAuthorization commandAuthorization) {
        try {
            //TODO: play with async vs sync etc.
            //TODO: stream!
            final byte[] bytes = commandAuthorization.toByteArray();
            session.getBasicRemote().sendBinary(ByteBuffer.wrap(bytes));
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

}
