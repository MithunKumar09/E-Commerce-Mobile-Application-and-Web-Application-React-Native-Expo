// frontend/src/pages/User/HomePage.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  Platform,
  ScrollView,
  PanResponder,
} from "react-native";
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from '@expo/vector-icons';
import ProductsContainer from "../../components/User/ProductsContainer";
import ButtonsContainer from "../../components/User/ButtonsContainer";
import CategoryProductsContainer from "../../components/User/CategoryProductsContainer";
import SkeletonComponent from "../../components/Loading/SkeletonComponent";
import { useUserStore } from '../../src/store/userStore';
import * as SecureStore from "expo-secure-store";
import { Ionicons } from '@expo/vector-icons';
const { width } = Dimensions.get("window");
import AsyncStorage from '@react-native-async-storage/async-storage';
const MASK_IMAGE = require('../../assets/mask/mask3.png');
const VOUCHER_IMAGE = require('../../assets/headphones.jpg');
import io from "socket.io-client";

const generateParticles = (x, y, count = 30) => {
  // Generate particle positions for blast effect
  return Array.from({ length: count }, () => ({
    x: x + Math.random() * 20 - 10,
    y: y + Math.random() * 20 - 10,
    size: Math.random() * 5 + 3,
    opacity: Math.random(),
  }));
};

const HomePage = ({ data }) => {
  const isMobile = width < 768;
  const carouselRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselImages, setCarouselImages] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const categoryListRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scratchedArea, setScratchedArea] = useState(new Animated.Value(0));
  const [particles, setParticles] = useState([]);
  const [scratchStarted, setScratchStarted] = useState(false);
  const [particlesCount, setParticlesCount] = useState(0);
  const [isScratching, setIsScratching] = useState(false);
  const navigation = useNavigation();
  const [offline, setOffline] = useState(false);
  const animatedValue = new Animated.Value(1);
const [socket, setSocket] = useState(null);
  // Wave animation for mask image (up and down)
  const maskAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(maskAnimation, {
            toValue: 25,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(maskAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    loopAnimation(); // Start the wave animation
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log("Fetching products from the database...");
        const response = await axios.get(`${SERVER_URL}/user/products`);
        // console.log("Initial products fetched:", response.data);

        const populatedProducts = await Promise.all(
          response.data.map(async (product) => {
            // console.log(`Fetching details for product ID: ${product._id}`);
            const populatedProduct = await axios.get(
              `${SERVER_URL}/user/products/${product._id}?populate=images`
            );
            // console.log(`Populated product details for ID ${product._id}:`, populatedProduct.data);

            // Log the images array from the populated product
            if (populatedProduct.data.images) {
              // console.log(`Images for product ID ${product._id}:`, populatedProduct.data.images);
            } else {
              console.log(`No images found for product ID ${product._id}.`);
            }

            return populatedProduct.data;
          })
        );

        // console.log("All populated products:", populatedProducts);
        setProducts(populatedProducts); // Set fetched products with populated images
        // Save products to AsyncStorage
        await AsyncStorage.setItem("products", JSON.stringify(populatedProducts));
      } catch (error) {
        console.error("Error fetching products:", error);

        // Try loading products from AsyncStorage in case of error
        const cachedProducts = await AsyncStorage.getItem("products");
        if (cachedProducts) {
          console.log("Loading products from cache...");
          setProducts(JSON.parse(cachedProducts));
          setOffline(true);
        }
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchCarouselImages = async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/admin/carousel`);
        console.log("Fetched carousel images from server:", response.data.images);
        setCarouselImages(response.data.images || []);

        // Save carousel images to AsyncStorage
        await AsyncStorage.setItem("carouselImages", JSON.stringify(response.data.images || []));
      } catch (error) {
        console.error("Error fetching carousel images:", error);

        // Try loading carousel images from AsyncStorage in case of error
        const cachedImages = await AsyncStorage.getItem("carouselImages");
        if (cachedImages) {
          console.log("Loading carousel images from cache...");
          setCarouselImages(JSON.parse(cachedImages));
          setOffline(true);
        }
      }
    };

    fetchCarouselImages();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/admin/categories`);
        console.log("Fetched categories from server:", response.data);
        setCategories(response.data);

        // Save categories to AsyncStorage
        await AsyncStorage.setItem("categories", JSON.stringify(response.data));
      } catch (error) {
        console.error("Error fetching categories:", error);

        // Try loading categories from AsyncStorage in case of error
        const cachedCategories = await AsyncStorage.getItem("categories");
        if (cachedCategories) {
          console.log("Loading categories from cache...");
          setCategories(JSON.parse(cachedCategories));
          setOffline(true);
        }
      }
    };

    fetchCategories();
  }, []);


  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const categoryItemWidth = isMobile ? 120 : 200;

  const categoriesToShow = Platform.OS === "web" ? categories.slice(0, 4) : categories;

  const allVouchers = [
    { id: 1, name: "Voucher 1", discount: "20% Off" },
    { id: 2, name: "Voucher 2", discount: "10% Off" },
  ];

  const dummyVoucharData = {
    id: 1,
    name: "Free Voucher",
    description: "Get 75% off on selected items.",
    productName: "Wireless Earbuds",
    worth: 2800,
    voucherPrice: 199.00,
    productPrice: 3999.00,
    image: "",
    startDate: "2024-12-15",
    endDate: "2024-12-20",
  };

  const [homepageVouchers, setHomepageVouchers] = useState(allVouchers.slice(0, 1));

  const categoryCardStyle = (isMobile) => ({
    width: isMobile ? 120 : "48%",
    height: isMobile ? 120 : 350,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    elevation: 5,
    shadowColor: "#000",
    overflow: "hidden",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 15,
    marginHorizontal: 5,
    borderWidth: 3,
    borderColor: "#000",
    backgroundColor: "#fff",
    position: "relative",
    shadowColor: "#888",
  });

  // Auto-scroll logic
  useEffect(() => {
    if (carouselImages.length === 0) return; // Prevent scroll if no images

    if (Platform.OS === "web") {
      let webIndex = 0;
      const webInterval = setInterval(() => {
        webIndex = webIndex === carouselImages.length - 1 ? 0 : webIndex + 1;
        if (carouselRef.current) {
          carouselRef.current.scrollToIndex({ index: webIndex, animated: true });
        }
      }, 3000);

      return () => clearInterval(webInterval);
    } else {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex =
            carouselImages.length > 0
              ? prevIndex === carouselImages.length - 1
                ? 0
                : prevIndex + 1
              : 0;//included
          carouselRef.current?.scrollToIndex({ index: nextIndex, animated: true });
          return nextIndex;
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [carouselImages]);

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const handleScrollToIndexFailed = (error) => {
    if (carouselImages.length === 0) return;//included
    const offset = error.averageItemLength * error.index;
    carouselRef.current?.scrollToOffset({ offset, animated: true });
  };

  const handleViewAll = () => {
    console.log("Navigate to all products screen");
    navigation.navigate('AllProducts');
  };

  const handleViewAllCategories = () => {
    console.log("Navigate to all categories screen");
  };

  const handleViewAllVouchers = () => {
    console.log("Navigate to all vouchers screen");
    navigation.navigate('VoucherCards'); // Navigate to VoucherCards screen
  };

  const groupedProducts = products.reduce((acc, product) => {
    (acc[product.category] = acc[product.category] || []).push(product);
    return acc;
  }, {});


  // Render Dot Indicators
  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {carouselImages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.activeDot,
            ]}
          />
        ))}
      </View>
    );
  };

  // Category Arrow Scroll Functions
  const scrollCategoryLeft = () => {
    if (categoryListRef.current) {
      categoryListRef.current.scrollToOffset({
        offset: Math.max(0, currentCategoryIndex - 1) * categoryItemWidth,
        animated: true,
      });
    }
  };

  const scrollCategoryRight = () => {
    if (categoryListRef.current) {
      categoryListRef.current.scrollToOffset({
        offset: (currentCategoryIndex + 1) * categoryItemWidth,
        animated: true,
      });
    }
  };

  // PanResponder for scratch effect
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (e, gestureState) => {
      const { locationX, locationY } = e.nativeEvent;

      // Add particles when the user moves their finger
      const newParticles = generateParticles(locationX, locationY);
      setParticles((prevParticles) => {
        setParticlesCount(prevCount => prevCount + newParticles.length);
        return [...prevParticles, ...newParticles];
      });

      // If particles are found above the mask, allow scratch effect
      if (particlesCount >= 5 && !scratchStarted) {
        setScratchStarted(true);
        setIsScratching(true); // Enable scratching
        setTimeout(() => {
          setScratchedArea(new Animated.Value(1)); // Reveal the image after delay
        }, 3000); // 3-second delay for scratching
      }
    },
    onPanResponderRelease: () => {
      // Only reveal voucher if scratching is valid
      if (isScratching) {
        setScratchedArea(new Animated.Value(1));
      }
      setParticles([]); // Clear particles when done
      setIsScratching(false); // Reset scratching state
    },
  });

  const animatedStyle = {
    transform: [{ scale: animatedValue }],
  };

  // Animation for the wave movement
  const maskWaveStyle = {
    transform: [
      {
        translateY: maskAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 5], // Adjust this range for the desired wave effect
        }),
      },
    ],
  };

  // Animation for the "Scratch Now" text visibility based on the wave position
  const scratchTextOpacity = maskAnimation.interpolate({
    inputRange: [0, 10], // When the wave is at the bottom, the text appears
    outputRange: [0, 1], // Fade in text when the mask is down
    extrapolate: 'clamp',
  });

  return (
    <LinearGradient colors={["rgba(135, 206, 250, 0.8)", "rgba(255, 255, 255, 1)"]} style={styles.gradientBackground}>
      {isLoading ? (
        // Skeleton Loading View
        <View style={styles.container}>
          <SkeletonComponent width="100%" height={200} borderRadius={10} />
          <View style={styles.skeletonCategoryContainer}>
            <SkeletonComponent width={120} height={120} borderRadius={10} />
            <SkeletonComponent width={120} height={120} borderRadius={10} />
            <SkeletonComponent width={120} height={120} borderRadius={10} />
          </View>
          <View style={styles.skeletonVoucherContainer}>
            <SkeletonComponent width={150} height={60} borderRadius={10} />
            <SkeletonComponent width={150} height={60} borderRadius={10} />
          </View>
        </View>
      ) : (
        <FlatList
          data={[1]}
          renderItem={() => (
            <View style={styles.container}>
              {/* Image Carousel */}
              <View style={styles.carouselContainer}>
                <FlatList
                  ref={carouselRef}
                  data={carouselImages}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) => index.toString()}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                  )}
                  onMomentumScrollEnd={handleScroll}
                  onScrollToIndexFailed={handleScrollToIndexFailed}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity activeOpacity={0.8}>
                      <Image
                        source={{ uri: item.url }}
                        style={[
                          styles.carouselImage,
                          Platform.OS === "web" && styles.carouselImageWeb,
                        ]}
                      />
                    </TouchableOpacity>
                  )}
                />
                {renderDots()}
              </View>

              {Platform.OS === "web" && <View style={styles.divider} />}
              {isMobile && <ButtonsContainer />}

              {/* Web Platform Layout */}
              {!isMobile && (
                <View style={styles.webLayoutContainer}>
                  {/* Category Section with Title */}
                  <View style={styles.categorySection}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    <View style={styles.gridContainer}>
                      {categoriesToShow.map((category) => (
                        <View key={category._id} style={categoryCardStyle(isMobile)}>
                          <Image source={{ uri: category.image }} style={styles.categoryImage} resizeMode="cover" />
                          <View style={styles.categoryOverlay}>
                            <Text style={styles.categoryText}>{category.name}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                    {Platform.OS === "web" && categories.length > 4 && (
                      <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={handleViewAllCategories}
                      >
                        <Text style={styles.viewAllText}>View All Categories</Text>
                        <FontAwesome name="angle-right" size={20} color="#007BFF" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Voucher Section with Title */}
                  <View style={styles.voucherSection}>
                    <Text style={styles.sectionTitle}>Exclusive Voucher</Text>
                    <Animated.View style={[styles.cardContainer, animatedStyle]}>
                      <LinearGradient
                        colors={["#ff9a9e", "#fad0c4"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradient}
                      >
                        <View style={styles.freeTagContainer}>
                          <Text style={styles.freeTagText}>Free</Text>
                        </View>

                        <View style={styles.voucharimageContainer}>
                          {/* Voucher Image - visible after scratch */}
                          <Animated.Image
                            source={VOUCHER_IMAGE}
                            style={[styles.voucherImage, {
                              opacity: scratchedArea,
                            }]}
                            onError={() => console.log("Failed to load image.")}
                          />

                          {/* Mask Overlay - hides after scratch */}
                          <Animated.Image
                            {...panResponder.panHandlers}
                            source={MASK_IMAGE}
                            style={[styles.maskImage, {
                              opacity: scratchedArea.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 0],
                              }),
                            },
                              maskWaveStyle,
                            ]}
                          />

                          {/* Particles for blast effect */}
                          {particles.map((particle, index) => (
                            <Animated.View
                              key={index}
                              style={[styles.particle, {
                                left: particle.x,
                                top: particle.y,
                                width: particle.size,
                                height: particle.size,
                                opacity: particle.opacity,
                              }]}
                            />
                          ))}

                          {/* Scratch Now Text */}
                          {scratchedArea.__getValue() < 1 && (
                            <Animated.View style={[styles.scratchNowTextContainer, { opacity: scratchTextOpacity }]}>
                              <Text style={styles.scratchNowText}>Scratch Now</Text>
                            </Animated.View>
                          )}
                        </View>

                        <View style={styles.infoContainer}>
                          <Text style={styles.name}>{dummyVoucharData.name}</Text>
                          {/* Updated infoSection */}
                          <View style={styles.infoSection}>
                            <View style={styles.row}>
                              <Ionicons name="bag" size={20} color="#6a0572" />
                              <Text style={styles.productName}>{dummyVoucharData.productName}</Text>
                            </View>
                            <View style={styles.row}>
                              <Ionicons name="information-circle" size={20} color="#6a0572" />
                              <Text style={styles.description}>{dummyVoucharData.description}</Text>
                            </View>
                            <View style={styles.row}>
                              <Ionicons name="cash" size={20} color="#6a0572" />
                              <Text style={styles.worth}>Worth: ₹{dummyVoucharData.worth}</Text>
                            </View>
                          </View>

                          <View style={styles.priceContainer}>
                            <Text style={styles.voucherPrice}>Voucher: ₹{dummyVoucharData.voucherPrice}</Text>
                            <Text style={styles.productPrice}>Product: ₹{dummyVoucharData.productPrice}</Text>
                          </View>
                          <Text style={styles.date}>{`Valid: ${dummyVoucharData.startDate} - ${dummyVoucharData.endDate}`}</Text>
                          <TouchableOpacity
                            style={styles.button}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="pricetag" size={20} color="white" />
                            <Text style={styles.buttonText}>Claim Now</Text>
                          </TouchableOpacity>
                        </View>
                      </LinearGradient>
                    </Animated.View>
                    {homepageVouchers.length === 1 && (
                      <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={handleViewAllVouchers}
                      >
                        <Text style={styles.viewAllText}>View All Vouchers</Text>
                        <FontAwesome name="angle-right" size={20} color="#007BFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Mobile Platform Layout */}
              {isMobile && (
                <>
                  <Text style={styles.sectionTitle}>Categories</Text>
                  <View style={styles.categoryArrow}>
                    {/* Left Arrow Button */}
                    <TouchableOpacity onPress={scrollCategoryLeft} style={styles.arrowButton}>
                      <FontAwesome name="angle-left" size={24} color="#000" />
                    </TouchableOpacity>

                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      ref={categoryListRef}
                      data={categoriesToShow}
                      renderItem={({ item }) => (
                        <View key={item._id} style={categoryCardStyle(isMobile)}>
                          <Image source={{ uri: item.image }} style={styles.categoryImage} resizeMode="cover" />
                          <View style={styles.categoryOverlay}>
                            <Text style={styles.categoryText}>{item.name}</Text>
                          </View>
                        </View>
                      )}
                      keyExtractor={(item, index) => index.toString()}
                      onScroll={({ nativeEvent }) => {
                        const index = Math.round(nativeEvent.contentOffset.x / categoryItemWidth);
                        setCurrentCategoryIndex(index);
                      }}
                    />
                    {/* Right Arrow Button */}
                    <TouchableOpacity onPress={scrollCategoryRight} style={styles.arrowButton}>
                      <FontAwesome name="angle-right" size={24} color="#000" />
                    </TouchableOpacity>
                  </View>
                  {isMobile && <View style={styles.divider} />}
                  <Text style={styles.sectionTitle}>Exclusive Voucher</Text>
                  <Animated.View style={[styles.cardContainer, animatedStyle]}>
                    <LinearGradient
                      colors={["#ff9a9e", "#fad0c4"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.gradient}
                    >
                      <View style={styles.freeTagContainer}>
                        <Text style={styles.freeTagText}>Free</Text>
                      </View>

                      <View style={styles.voucharimageContainer}>
                        {/* Voucher Image - visible after scratch */}
                        <Animated.Image
                          source={VOUCHER_IMAGE}
                          style={[styles.voucherImage, {
                            opacity: scratchedArea,
                          }]}
                          onError={() => console.log("Failed to load image.")}
                        />

                        {/* Mask Overlay - hides after scratch */}
                        <Animated.Image
                          {...panResponder.panHandlers}
                          source={MASK_IMAGE}
                          style={[styles.maskImage, {
                            opacity: scratchedArea.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 0],
                            }),
                          },
                            maskWaveStyle,
                          ]}
                        />

                        {/* Particles for blast effect */}
                        {particles.map((particle, index) => (
                          <Animated.View
                            key={index}
                            style={[styles.particle, {
                              left: particle.x,
                              top: particle.y,
                              width: particle.size,
                              height: particle.size,
                              opacity: particle.opacity,
                            }]}
                          />
                        ))}

                        {/* Scratch Now Text */}
                        {scratchedArea.__getValue() < 1 && (
                          <Animated.View style={[styles.scratchNowTextContainer, { opacity: scratchTextOpacity }]}>
                            <Text style={styles.scratchNowText}>Scratch Now</Text>
                          </Animated.View>
                        )}
                      </View>

                      <View style={styles.infoContainer}>
                        <Text style={styles.name}>{dummyVoucharData.name}</Text>
                        {/* Updated infoSection */}
                        <View style={styles.infoSection}>
                          <View style={styles.row}>
                            <Ionicons name="bag" size={20} color="#6a0572" />
                            <Text style={styles.productName}>{dummyVoucharData.productName}</Text>
                          </View>
                          <View style={styles.row}>
                            <Ionicons name="information-circle" size={20} color="#6a0572" />
                            <Text style={styles.description}>{dummyVoucharData.description}</Text>
                          </View>
                          <View style={styles.row}>
                            <Ionicons name="cash" size={20} color="#6a0572" />
                            <Text style={styles.worth}>Worth: ₹{dummyVoucharData.worth}</Text>
                          </View>
                        </View>

                        <View style={styles.priceContainer}>
                          <Text style={styles.voucherPrice}>Voucher: ₹{dummyVoucharData.voucherPrice}</Text>
                          <Text style={styles.productPrice}>Product: ₹{dummyVoucharData.productPrice}</Text>
                        </View>
                        <Text style={styles.date}>{`Valid: ${dummyVoucharData.startDate} - ${dummyVoucharData.endDate}`}</Text>
                        <TouchableOpacity
                          style={styles.button}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="pricetag" size={20} color="white" />
                          <Text style={styles.buttonText}>Claim Now</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                  {isMobile && <View style={styles.divider} />}
                </>
              )}
              {/* Adjust ProductsContainer size for Mobile */}
              <View style={isMobile ? styles.mobileProductsContainer : styles.webProductsContainer}>
                <ProductsContainer products={products} onViewAll={handleViewAll} />
                {Object.keys(groupedProducts).map((category) => (
                  <CategoryProductsContainer
                    key={category}
                    title={category}
                    products={groupedProducts[category]}
                    onViewAll={() => handleViewAll(category)}
                  />
                ))}
              </View>
            </View>
          )}
          keyExtractor={() => '1'}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 5,
    backgroundColor: "transparent",
  },
  carouselContainer: {
    marginBottom: 20,
  },
  carouselImage: {
    width: width < 768 ? width - 40 : (width - 60) / 2,
    height: width < 768 ? (width - 40) / 2 : ((width - 60) / 2) / 2,
    marginRight: 10,
    borderRadius: 10,
  },
  carouselImageWeb: {
    width: width - 40,
    height: (width - 40) / 5,
    objectFit: "contain",
    alignSelf: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D3D3D3",
    margin: 5,
  },
  activeDot: {
    backgroundColor: "#1E90FF",
  },
  divider: {
    height: 4,
    marginVertical: 20,
    marginHorizontal: "10%",
    backgroundColor: "linear-gradient(to right, #0078FF, #00FF78)",
    borderRadius: 10,
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
  },
  webLayoutContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  voucherSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  categorySection: {
    flex: 2,
    paddingHorizontal: 30,
  },
  sectionTitle: {
    fontSize: width < 768 ? 18 : 26,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 10,
    alignSelf: "center",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  categoryCard: {
    marginBottom: 20,
    marginHorizontal: 10,
    width: "45%",
    height: 150,
    borderRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  categoryText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  categoryArrow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  arrowButton: {
    padding: 10,
    width: 50,
    height: 50,
    alignItems: "center",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#f8f9fa",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
    marginVertical: 10,
    width: "80%",
    alignSelf: "center",
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007BFF",
    marginRight: 8,
  },
  skeletonCategoryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  skeletonVoucherContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  //vouchar card section
  cardContainer: {
    alignSelf: "center",
    width: width * 0.9,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    borderColor: "#ddd",
    borderWidth: 1,
    marginVertical: 10,
    transform: [{ scale: 1 }],
  },
  gradient: {
    padding: 15,
    borderRadius: 20,
  },
  freeTagContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'green',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  freeTagText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  voucharimageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  voucherImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  maskImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
  },
  scratchNowTextContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scratchNowText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  infoContainer: {
    padding: 10,
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoSection: {
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#fdfdfd',
    padding: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  productName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  description: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
  },
  worth: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  voucherPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e63946',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6a0572',
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginVertical: 5,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6a0572',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 5,
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 50,
  },
});

export default HomePage;
