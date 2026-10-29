import React from 'react';
import { Crown, Shield, User, Stethoscope } from 'lucide-react';

export default function InheritanceBar() {
  return (
    <div className="inheritance-flow-bar">
      <div className="flow-title">
        <span>MongoDB Database Architecture & Inheritance:</span>
      </div>
      <div className="flow-chain">
        <span className="flow-node superadmin" title="Creates Admins in 'admins' collection">
          <Crown size={14} /> Superadmin
        </span>
        <span className="flow-arrow">➔</span>
        <span className="flow-node admin" title="Creates Users in 'user' collection">
          <Shield size={14} /> Admin
        </span>
        <span className="flow-arrow">➔</span>
        <span className="flow-node user" title="Enters Doctor data in 'doctors' collection">
          <User size={14} /> User (Home)
        </span>
        <span className="flow-arrow">➔</span>
        <span className="flow-node doctor" title="Created with 3 inputs: Name, Photo, Clinic">
          <Stethoscope size={14} /> Doctor Profile
        </span>
      </div>
    </div>
  );
}
