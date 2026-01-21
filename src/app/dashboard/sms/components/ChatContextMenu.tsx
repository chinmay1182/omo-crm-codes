"use client";

import { useEffect, useRef } from "react";
import styles from "./ChatContextMenu.module.css";

interface Agent {
  id: number;
  username: string;
  full_name: string;
  status: string;
}

interface ChatContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  chatId: string;
  chatName: string;
  agents: Agent[];
  onAssign: (agentId: number) => void;
  onUnassign?: () => void;
  isAssigned?: boolean;
  currentAssignment?: {
    agent_id: number;
    full_name: string;
    username: string;
  };
}

export default function ChatContextMenu({
  isOpen,
  position,
  onClose,
  chatId,
  chatName,
  agents,
  onAssign,
  onUnassign,
  isAssigned = false,
  currentAssignment,
}: ChatContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("scroll", onClose);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", onClose);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAssignClick = (agentId: number) => {
    onAssign(agentId);
    onClose();
  };

  const handleUnassignClick = () => {
    if (onUnassign) {
      onUnassign();
      onClose();
    }
  };

  // Adjust position to prevent going off-screen
  const adjustedPosition = {
    left: Math.min(position.x, window.innerWidth - 200),
    top: Math.min(position.y, window.innerHeight - 300),
  };

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ left: adjustedPosition.left, top: adjustedPosition.top }}
    >
      <div className={styles.menuHeader}>
        {currentAssignment ? (
          <>
            <strong>{chatName}</strong> is assigned to:
            <div style={{ color: '#25d366', fontWeight: 'bold', marginTop: '4px' }}>
              {currentAssignment.full_name} (@{currentAssignment.username})
            </div>
            <hr style={{ margin: '8px 0', border: '1px solid #eee' }} />
            Reassign to:
          </>
        ) : (
          <>Assign <strong>{chatName}</strong> to:</>
        )}
      </div>

      <div className={styles.agentsList}>
        {agents.length === 0 ? (
          <div className={styles.noAgents}>No agents available</div>
        ) : (
          <>
            {agents
              .filter(agent => !currentAssignment || agent.id !== currentAssignment.agent_id)
              .map((agent) => (
                <div
                  key={agent.id}
                  className={styles.menuItem}
                  onClick={() => handleAssignClick(agent.id)}
                >
                  <div className={styles.agentAvatar}>
                    {agent.username.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.agentInfo}>
                    <div className={styles.agentName}>{agent.full_name}</div>
                    <div className={styles.agentUsername}>@{agent.username}</div>
                  </div>
                </div>
              ))}

            {/* Add Unassign option */}
            {isAssigned && currentAssignment && (
              <div
                className={styles.menuItem}
                onClick={handleUnassignClick}
                style={{ color: "#ef4444" }}
              >
                <div
                  className={styles.agentAvatar}
                  style={{ backgroundColor: "#ef4444" }}
                >
                  <i className="fa-light fa-times"></i>
                </div>
                <div className={styles.agentInfo}>
                  <div className={styles.agentName}>Unassign Chat</div>
                  <div className={styles.agentUsername}>Remove assignment</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}