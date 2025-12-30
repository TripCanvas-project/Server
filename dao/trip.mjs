import Trip from "../models/Trip.mjs";
import mongoose from "mongoose";
import crypto from "crypto";

export async function findTripsByUserId(userId) {
  const objectId = new mongoose.Types.ObjectId(userId);

  return await Trip.find({
    $or: [{ owner: objectId }, { "collaborators.userId": objectId }],
  })
    .sort({ createdAt: -1 })
    .populate("owner", "nickname email")
    .populate("collaborators.userId", "nickname email")
    .lean();
}

export async function findById(tripId) {
  if (!mongoose.Types.ObjectId.isValid(tripId)) return null;

  return await Trip.findById(tripId)
    .populate("owner", "nickname email")
    .populate("collaborators.userId", "nickname email")
    .lean();
}

export async function findByIdAndUserOrCollaborator(
  tripId,
  userId,
  options = {}
) {
  if (!mongoose.Types.ObjectId.isValid(tripId)) return null;
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  const query = Trip.findOne({
    _id: tripId,
    $or: [{ owner: userId }, { "collaborators.userId": userId }],
  });

  if (options.select) {
    query.select(options.select);
  }

  if (options.populate) {
    query.populate(options.populate);
  }

  return await query.exec();
}

export async function findTripsByUserIdAndStatus(userId, status) {
  const objectId = new mongoose.Types.ObjectId(userId);

  return await Trip.find({
    status,
    $or: [{ owner: objectId }, { "collaborators.userId": objectId }],
  }).lean();
}

// trip title 업데이트 (권한: owner or collaborator only)
export async function updateTripTitle(tripId, userId, title) {
  const trip = await Trip.findOneAndUpdate(
    {
      _id: tripId,
      $or: [{ owner: userId }, { collaborators: userId }],
    },
    { $set: { title } },
    { new: true }
  );

  if (!trip) {
    throw new Error("여행 제목 변경 권한이 없습니다.");
  }
}

// 어떤 user에 대한 trip counts select
export async function countTripsByUserId(userId) {
  const objectId = new mongoose.Types.ObjectId(userId);

  return await Trip.aggregate([
    {
      $match: {
        $or: [{ owner: objectId }, { "collaborators.userId": objectId }],
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
}

export async function findTripHistoryByUserId(userId, limit = 10) {
  try {
    const trips = await Trip.find({ owner: userId })
      .select("_id title startDate endDate categories constraints")
      .sort({ endDate: -1 })
      .limit(limit)
      .lean();

    return trips.map((trip) => ({
      _id: trip._id,
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
      dateRange: `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`,
      totalBudget: trip.constraints?.budget?.total || 0,
      budgetDisplay: `₩${(trip.constraints?.budget?.total || 0).toLocaleString(
        "ko-KR"
      )}`,
      category: trip.categories?.[0] || "etc",
      placesDisplay: `${trip.places?.length || 0}개 장소`,
    }));
  } catch (error) {
    console.error("findTripHistoryByUserId Error:", error);
    throw error;
  }
}

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function getCategoryIcon(category) {
  const iconMap = {
    카페: "☕",
    맛집: "🍽️",
    "역사/문화": "🏛️",
    자연: "🌲",
    쇼핑: "🛍️",
    캠핑: "⛺",
  };
  return iconMap[category] || "🏖️";
}

export async function createTrip(tripData = {}) {
    try {
        const trip = await Trip.create({
            title: "클릭하여 여행 타이틀 설정",
            owner: tripData.owner,
            destination: tripData.destination || {
                name: "미정",
                district: "미정",
                city: "미정",
            },
            startDate: tripData.startDate,
            endDate: tripData.endDate,
            duration: tripData.duration || 2,
            status: tripData.status || "planning",
            // 나머지 필드는 스키마 default 값 사용
        });
        return trip;
    } catch (err) {
        console.error("tripDao.createTrip error:", err);
        throw err;
    }
}

export async function updateTrip(tripId, ownerId, updateData) {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: tripId, owner: ownerId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    return trip;
  } catch (err) {
    console.error("tripDao.updateTrip error:", err);
    throw err;
  }
}

export async function deleteTrip(tripId, ownerId) {
  try {
    const trip = await Trip.findOneAndDelete({ _id: tripId, owner: ownerId });

    if (!trip) {
      throw new Error("여행을 찾을 수 없습니다.");
    }

    return trip;
  } catch (err) {
    console.error("tripDao.deleteTrip error:", err);
    throw err;
  }
}

export async function createTripInvite(tripId, expireDays = 7) {
  // 랜덤 토큰 생성
  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000);

  // Trip의 invite 필드 업데이트
  const trip = await Trip.findByIdAndUpdate(
    tripId,
    {
      invite: {
        token,
        expiresAt,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!trip) {
    throw new Error("Trip not found");
  }

  return {
    inviteToken: token,
    expiresAt,
  };
}

// 초대 토큰으로 Trip 찾기
export async function findTripByInviteToken(token) {
  return await Trip.findOne({
    "invite.token": token,
  });
}

// 초대 정보 삭제
export async function clearTripInvite(tripId) {
  await Trip.findByIdAndUpdate(tripId, {
    $unset: { invite: "" },
  });
}

export async function addCollaborator(tripId, collaboratorId) {
  const result = await Trip.updateOne(
    {
      _id: tripId,
      "collaborators.userId": { $ne: collaboratorId },
    },
    {
      $push: {
        collaborators: {
          userId: collaboratorId,
          role: "viewer",
          joinedAt: new Date(),
        },
      },
      $inc: { peopleCount: 1 },
    }
  );

  if (result.modifiedCount === 0) {
    throw new Error("이미 참여한 사용자입니다.");
  }
}

export async function createTripInvite(tripId, expireDays = 7) {
  // 랜덤 토큰 생성
  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000);

  // Trip의 invite 필드 업데이트
  const trip = await Trip.findByIdAndUpdate(
    tripId,
    {
      invite: {
        token,
        expiresAt,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!trip) {
    throw new Error("Trip not found");
  }

  return {
    inviteToken: token,
    expiresAt,
  };
}

// 초대 토큰으로 Trip 찾기
export async function findTripByInviteToken(token) {
  return await Trip.findOne({
    "invite.token": token,
  });
}

// 초대 정보 삭제
export async function clearTripInvite(tripId) {
  await Trip.findByIdAndUpdate(tripId, {
    $unset: { invite: "" },
  });
}

export async function addCollaborator(tripId, collaboratorId) {
  const result = await Trip.updateOne(
    {
      _id: tripId,
      "collaborators.userId": { $ne: collaboratorId },
    },
    {
      $push: {
        collaborators: {
          userId: collaboratorId,
          role: "viewer",
          joinedAt: new Date(),
        },
      },
      $inc: { peopleCount: 1 },
    }
  );

  if (result.modifiedCount === 0) {
    throw new Error("이미 참여한 사용자입니다.");
  }
}