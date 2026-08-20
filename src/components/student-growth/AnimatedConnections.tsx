import React, { useEffect, useState } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { modernColors } from "../../data/studentGrowthData";

interface AnimatedConnectionsProps {
  cards: any[];
  selectedCardId?: string | null;
  containerWidth: number;
  containerHeight: number;
}

interface CardPosition {
  x: number;
  y: number;
  id: string;
}

const AnimatedConnections: React.FC<AnimatedConnectionsProps> = ({
  cards,
  selectedCardId,
  containerWidth,
  containerHeight,
}) => {
  const [animationValue] = useState(new Animated.Value(0));
  const [particleAnimations] = useState(
    Array.from({ length: 8 }, () => new Animated.Value(0)),
  );

  useEffect(() => {
    // Start main animation
    const mainLoop = Animated.loop(
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: false,
      }),
    );
    mainLoop.start();

    // Start particle animations with staggered delays
    const particleLoops = particleAnimations.map((anim, index) => {
      const loop = Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000 + index * 200,
          useNativeDriver: false,
        }),
      );
      loop.start();
      return loop;
    });

    return () => {
      mainLoop.stop();
      particleLoops.forEach((loop) => loop.stop());
    };
  }, []);

  // Calculate card positions based on grid layout (3 cards per row)
  const getCardPositions = (): CardPosition[] => {
    const cardWidth = (containerWidth - 32) / 3; // Account for padding
    const cardHeight = 140;
    const positions: CardPosition[] = [];

    cards.forEach((card, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;

      positions.push({
        id: card.id,
        x: col * (cardWidth + 8) + cardWidth / 2 + 16, // Center of card
        y: row * (cardHeight + 16) + cardHeight / 2 + 16, // Center of card
      });
    });

    return positions;
  };

  const cardPositions = getCardPositions();

  // Create meaningful intelligence connections based on educational theory
  const getConnectionPaths = () => {
    const connections = [
      // Cognitive Intelligence Cluster (High cognitive load connections)
      {
        from: "linguistic",
        to: "mathematical_logical",
        strength: 0.9,
        category: "cognitive",
      },
      {
        from: "mathematical_logical",
        to: "spatial",
        strength: 0.8,
        category: "cognitive",
      },
      {
        from: "spatial",
        to: "linguistic",
        strength: 0.7,
        category: "cognitive",
      },

      // Social-Emotional Intelligence Cluster
      {
        from: "intrapersonal",
        to: "interpersonal",
        strength: 0.9,
        category: "social-emotional",
      },
      {
        from: "interpersonal",
        to: "school_community",
        strength: 0.8,
        category: "social-emotional",
      },
      {
        from: "school_community",
        to: "society",
        strength: 0.9,
        category: "social-emotional",
      },
      {
        from: "intrapersonal",
        to: "existential",
        strength: 0.7,
        category: "social-emotional",
      },

      // Creative Arts Cluster
      { from: "music", to: "spatial", strength: 0.8, category: "creative" },
      {
        from: "spatial",
        to: "existential",
        strength: 0.6,
        category: "creative",
      },
      { from: "music", to: "existential", strength: 0.5, category: "creative" },

      // Physical & Life Skills Cluster
      {
        from: "bodily_kinesthetic",
        to: "naturalistic",
        strength: 0.7,
        category: "physical",
      },
      {
        from: "naturalistic",
        to: "lifeskills",
        strength: 0.8,
        category: "physical",
      },
      {
        from: "attendance",
        to: "lifeskills",
        strength: 0.9,
        category: "physical",
      },
      {
        from: "bodily_kinesthetic",
        to: "lifeskills",
        strength: 0.6,
        category: "physical",
      },

      // Cross-cluster meaningful connections
      {
        from: "attendance",
        to: "school_community",
        strength: 0.7,
        category: "cross",
      },
      { from: "existential", to: "society", strength: 0.6, category: "cross" },
      {
        from: "interpersonal",
        to: "linguistic",
        strength: 0.6,
        category: "cross",
      },
    ];

    return connections
      .map((connection, index) => {
        const fromPos = cardPositions.find((pos) => pos.id === connection.from);
        const toPos = cardPositions.find((pos) => pos.id === connection.to);

        if (!fromPos || !toPos) return null;

        // Create curved path between cards
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;
        const controlOffset = 30;

        const path = `M ${fromPos.x} ${fromPos.y} Q ${midX + controlOffset} ${midY - controlOffset} ${toPos.x} ${toPos.y}`;

        return {
          path,
          strength: connection.strength,
          category: connection.category,
          index,
          fromId: connection.from,
          toId: connection.to,
        };
      })
      .filter(Boolean);
  };

  const connectionPaths = getConnectionPaths();

  // Get intelligence cluster for a given card
  const getIntelligenceCluster = (cardId: string) => {
    const cognitiveCluster = ["linguistic", "mathematical_logical", "spatial"];
    const socialEmotionalCluster = [
      "intrapersonal",
      "interpersonal",
      "school_community",
      "society",
      "existential",
    ];
    const creativeCluster = ["music", "spatial", "existential"];
    const physicalCluster = [
      "bodily_kinesthetic",
      "naturalistic",
      "lifeskills",
      "attendance",
    ];

    if (cognitiveCluster.includes(cardId)) return cognitiveCluster;
    if (socialEmotionalCluster.includes(cardId)) return socialEmotionalCluster;
    if (creativeCluster.includes(cardId)) return creativeCluster;
    if (physicalCluster.includes(cardId)) return physicalCluster;
    return [];
  };

  // Generate enhanced animated particles for flowing effect
  const renderAnimatedParticles = () => {
    const relatedConnections = selectedCardId
      ? connectionPaths.filter(
          (conn) =>
            conn.fromId === selectedCardId || conn.toId === selectedCardId,
        )
      : [];

    // Show more particles for selected card connections
    const particlesToShow = selectedCardId
      ? Math.min(relatedConnections.length * 2, 8)
      : 4;

    return particleAnimations.slice(0, particlesToShow).map((anim, index) => {
      let connection;

      if (selectedCardId && relatedConnections.length > 0) {
        connection = relatedConnections[index % relatedConnections.length];
      } else {
        const pathIndex = index % connectionPaths.length;
        connection = connectionPaths[pathIndex];
      }

      if (!connection) return null;

      const fromPos = cardPositions.find((pos) => pos.id === connection.fromId);
      const toPos = cardPositions.find((pos) => pos.id === connection.toId);

      if (!fromPos || !toPos) return null;

      // Different particle colors based on connection category
      const getParticleColor = (category: string) => {
        switch (category) {
          case "cognitive":
            return "#8B5CF6";
          case "social-emotional":
            return "#10B981";
          case "creative":
            return "#F59E0B";
          case "physical":
            return "#059669";
          default:
            return modernColors.primary;
        }
      };

      return (
        <Animated.View
          key={`particle-${index}`}
          style={[
            styles.particle,
            {
              backgroundColor: getParticleColor(connection.category),
              left: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [fromPos.x - 3, toPos.x - 3],
              }),
              top: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [fromPos.y - 3, toPos.y - 3],
              }),
              opacity: anim.interpolate({
                inputRange: [0, 0.2, 0.8, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 1.2, 0.5],
                  }),
                },
              ],
            },
          ]}
        />
      );
    });
  };

  return (
    <View
      style={[
        styles.container,
        { width: containerWidth, height: containerHeight },
      ]}
    >
      {/* SVG Connections */}
      <Svg
        height={containerHeight}
        width={containerWidth}
        style={StyleSheet.absoluteFillObject}
      >
        <Defs>
          {/* Cognitive Intelligence Connections */}
          <SvgLinearGradient
            id="cognitiveGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
          </SvgLinearGradient>

          {/* Social-Emotional Intelligence Connections */}
          <SvgLinearGradient
            id="socialGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
          </SvgLinearGradient>

          {/* Creative Arts Connections */}
          <SvgLinearGradient
            id="creativeGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#EC4899" stopOpacity="0.4" />
          </SvgLinearGradient>

          {/* Physical & Life Skills Connections */}
          <SvgLinearGradient
            id="physicalGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#059669" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#DC2626" stopOpacity="0.4" />
          </SvgLinearGradient>

          {/* Cross-cluster Connections */}
          <SvgLinearGradient
            id="crossGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#6B7280" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#9CA3AF" stopOpacity="0.3" />
          </SvgLinearGradient>

          {/* Selected Connection */}
          <SvgLinearGradient
            id="selectedGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop
              offset="0%"
              stopColor={modernColors.primary}
              stopOpacity="0.9"
            />
            <Stop
              offset="100%"
              stopColor={modernColors.secondary}
              stopOpacity="0.9"
            />
          </SvgLinearGradient>
        </Defs>

        {/* Render connection paths */}
        {connectionPaths.map((connection, index) => {
          const isSelected =
            selectedCardId &&
            (connection.fromId === selectedCardId ||
              connection.toId === selectedCardId);

          // Get gradient based on category
          const getGradientId = (category: string) => {
            switch (category) {
              case "cognitive":
                return "cognitiveGradient";
              case "social-emotional":
                return "socialGradient";
              case "creative":
                return "creativeGradient";
              case "physical":
                return "physicalGradient";
              case "cross":
                return "crossGradient";
              default:
                return "crossGradient";
            }
          };

          return (
            <Path
              key={`path-${index}`}
              d={connection.path}
              stroke={
                isSelected
                  ? "url(#selectedGradient)"
                  : `url(#${getGradientId(connection.category)})`
              }
              strokeWidth={
                isSelected ? 4 : Math.max(connection.strength * 3, 1.5)
              }
              fill="none"
              strokeDasharray={
                isSelected ? "0" : connection.category === "cross" ? "6,3" : "0"
              }
              strokeLinecap="round"
              opacity={isSelected ? 1 : 0.7}
            />
          );
        })}

        {/* Render connection nodes with cluster highlighting */}
        {cardPositions.map((position, index) => {
          const isSelected = selectedCardId === position.id;
          const cluster = selectedCardId
            ? getIntelligenceCluster(selectedCardId)
            : [];
          const isInCluster = cluster.includes(position.id);
          const isClusterRelated =
            selectedCardId && (isSelected || isInCluster);

          return (
            <Circle
              key={`node-${position.id}`}
              cx={position.x}
              cy={position.y}
              r={isSelected ? 8 : isClusterRelated ? 6 : 3}
              fill={
                isSelected
                  ? modernColors.primary
                  : isClusterRelated
                    ? modernColors.secondary
                    : modernColors.accent
              }
              opacity={isSelected ? 1 : isClusterRelated ? 0.9 : 0.5}
              stroke={isClusterRelated ? modernColors.primary : "transparent"}
              strokeWidth={isClusterRelated ? 2 : 0}
            />
          );
        })}
      </Svg>

      {/* Animated Particles */}
      {selectedCardId && renderAnimatedParticles()}

      {/* Ambient glow effect */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            opacity: animationValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.1, 0.3, 0.1],
            }),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: modernColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  ambientGlow: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: modernColors.primary,
    borderRadius: 40,
    opacity: 0.05,
  },
});

export default AnimatedConnections;
